#include "PlayerZeroLoaderComponent.h"

#include "PlayerZero.h"
#include "GameFramework/Actor.h"
#include "Components/SkeletalMeshComponent.h"
#include "Engine/World.h"
#include "Subsystems/PlayerZeroSubsystem.h"

UPlayerZeroLoaderComponent::UPlayerZeroLoaderComponent()
{
	TargetSkeleton = nullptr;
	TargetMeshComponent = nullptr;
	PrimaryComponentTick.bCanEverTick = false;
}

void UPlayerZeroLoaderComponent::BeginPlay()
{
	Super::BeginPlay();

	if (!TargetMeshComponent)
	{
		TargetMeshComponent = GetOwner()->FindComponentByClass<USkeletalMeshComponent>();
	}
}

void UPlayerZeroLoaderComponent::LoadAvatar(const FAvatarConfig& CharacterConfig)
{
	if (AvatarId.IsEmpty())
	{
		UE_LOG(LogPlayerZero, Warning, TEXT("AvatarLoaderComponent: No AvatarId set."));
		return;
	}

	UPlayerZeroSubsystem* Subsystem = GetWorld()->GetGameInstance()->GetSubsystem<UPlayerZeroSubsystem>(); ;

	if (!Subsystem)
	{
		UE_LOG(LogPlayerZero, Error, TEXT("AvatarLoaderComponent: PlayerZeroSubsystem not found."));
		return;
	}

	FOnGltfAssetLoaded OnGltfAssetLoaded;
	OnGltfAssetLoaded.BindUObject(this, &UPlayerZeroLoaderComponent::ReplaceMeshWithGltfAsset);

	Subsystem->LoadAvatarAsset(AvatarId, CharacterConfig, OnGltfAssetLoaded);
}

void UPlayerZeroLoaderComponent::ReplaceMeshWithGltfAsset(UglTFRuntimeAsset* GltfAsset)
{
	if (!GltfAsset)
	{
		UE_LOG(LogPlayerZero, Error, TEXT("AvatarLoader: GLTF asset is null."));
		OnAvatarLoadComplete.Broadcast(nullptr);
		return;
	}

	AActor* Owner = GetOwner();
	if (!Owner)
	{
		UE_LOG(LogPlayerZero, Error, TEXT("AvatarLoader: Owner is null."));
		OnAvatarLoadComplete.Broadcast(nullptr);
		return;
	}
	
	// Remove old skeletal mesh if present
	if (TargetMeshComponent)
	{
		TargetMeshComponent->DestroyComponent();
		TargetMeshComponent = nullptr;
	}

	TArray<FglTFRuntimeNode> Nodes = GltfAsset->GetNodes();
	USkeletalMeshComponent* MasterMeshComponent = nullptr;

	// Build skeletal mesh config
	FglTFRuntimeSkeletalMeshConfig MeshConfig;
	MeshConfig.bIgnoreMissingBones = true;
	if (!TargetSkeleton)
	{
		UE_LOG(LogPlayerZero, Warning, TEXT("AvatarLoader: No TargetSkeleton set. Using default skeleton."));
		MeshConfig.Skeleton = TargetSkeleton;
		MeshConfig.SkeletonConfig.CopyRotationsFrom = TargetSkeleton;
		MeshConfig.SkeletonConfig.bAssignUnmappedBonesToParent = true;
	}

	for (const FglTFRuntimeNode& Node : Nodes)
	{
		if (GltfAsset->NodeIsBone(Node.Index) || Node.Name.Contains("Armature"))
		{
			continue;
		}

		if (Node.SkinIndex >= 0)
		{
			USkeletalMesh* SkeletalMesh = GltfAsset->LoadSkeletalMesh(Node.MeshIndex, Node.SkinIndex, MeshConfig);
			if (!SkeletalMesh)
			{
				UE_LOG(LogPlayerZero, Error, TEXT("AvatarLoader: Failed to load skeletal mesh from node %s"), *Node.Name);
				continue;
			}
			// Create new skeletal mesh component
			USkeletalMeshComponent* NewMeshComp = NewObject<USkeletalMeshComponent>(Owner);
			NewMeshComp->SetSkeletalMesh(SkeletalMesh);
			NewMeshComp->SetupAttachment(Owner->GetRootComponent());
			NewMeshComp->SetRelativeTransform(Node.Transform);
			NewMeshComp->RegisterComponent();

			// Make this component the master mesh
			if (!MasterMeshComponent)
			{
				MasterMeshComponent = NewMeshComp;
				TargetMeshComponent = NewMeshComp;

				// Set animation blueprint if needed
				if (TargetSkeleton && TargetMeshComponent && AnimationBlueprint)
				{
					TargetMeshComponent->SetAnimationMode(EAnimationMode::AnimationBlueprint);
					TargetMeshComponent->SetAnimClass(AnimationBlueprint);
					TargetMeshComponent->InitAnim(true);
				}
			}
			else
			{
#if ENGINE_MAJOR_VERSION > 5 || (ENGINE_MAJOR_VERSION == 5 && ENGINE_MINOR_VERSION >= 3)
				NewMeshComp->SetLeaderPoseComponent(MasterMeshComponent);
#else
				NewMeshComp->SetMasterPoseComponent(MasterMeshComponent);
#endif
			}
		}
	}

	if (TargetMeshComponent)
	{
		OnAvatarLoadComplete.Broadcast(TargetMeshComponent);
	}
	else
	{
		UE_LOG(LogPlayerZero, Warning, TEXT("AvatarLoader: No skeletal mesh components were created."));
		OnAvatarLoadComplete.Broadcast(nullptr);
	}
}

void UPlayerZeroLoaderComponent::LogSkeletonCompatibility(USkeletalMesh* Mesh, USkeleton* ExpectedSkeleton)
{
	if (!Mesh || !ExpectedSkeleton)
	{
		UE_LOG(LogPlayerZero, Warning, TEXT("Bone check: Invalid mesh or skeleton"));
		return;
	}

	const int32 MeshBoneCount = Mesh->GetRefSkeleton().GetNum();
	const int32 SkeletonBoneCount = ExpectedSkeleton->GetReferenceSkeleton().GetNum();

	if (MeshBoneCount != SkeletonBoneCount)
	{
		UE_LOG(LogPlayerZero, Warning, TEXT("Bone count mismatch: Mesh has %d bones, Skeleton has %d bones."),
			MeshBoneCount, SkeletonBoneCount);
	}
	else
	{
		UE_LOG(LogPlayerZero, Log, TEXT("Bone count matches (%d bones)."), MeshBoneCount);
	}

	// Optional: Compare bone names
	const FReferenceSkeleton& MeshRefSkeleton = Mesh->GetRefSkeleton();
	const FReferenceSkeleton& SkeletonRefSkeleton = ExpectedSkeleton->GetReferenceSkeleton();

	const int32 NumToCompare = FMath::Min(MeshBoneCount, SkeletonBoneCount);

	for (int32 BoneIndex = 0; BoneIndex < NumToCompare; ++BoneIndex)
	{
		const FName MeshBoneName = MeshRefSkeleton.GetBoneName(BoneIndex);
		const FName SkeletonBoneName = SkeletonRefSkeleton.GetBoneName(BoneIndex);

		if (MeshBoneName != SkeletonBoneName)
		{
			UE_LOG(LogPlayerZero, Warning, TEXT("Bone mismatch at index %d: Mesh has '%s', Skeleton has '%s'"),
				BoneIndex, *MeshBoneName.ToString(), *SkeletonBoneName.ToString());
		}
	}
}

