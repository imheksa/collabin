// Fill out your copyright notice in the Description page of Project Settings.


#include "PlayerZeroActor.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "glTFRuntimeSkeletalMeshComponent.h"
#include "PlayerZero.h"
#include "PlayerZeroCharacterTypes.h"

APlayerZeroActor::APlayerZeroActor()
{
	PrimaryActorTick.bCanEverTick = false;
	AssetRoot = CreateDefaultSubobject<USceneComponent>(TEXT("AssetRoot"));
	RootComponent = AssetRoot;
	MasterPoseComponent = nullptr;
}

void APlayerZeroActor::BeginPlay()
{
	Super::BeginPlay();
}


void APlayerZeroActor::LoadCharacter(const FPlayerZeroCharacterData& InCharacterData, UglTFRuntimeAsset* GltfAsset)
{
	CharacterData = InCharacterData;
	if(AnimationConfigsByStyleId.Contains(CharacterData.BaseModelId))
	{
		AnimationConfig = AnimationConfigsByStyleId[CharacterData.BaseModelId];
		SkeletalMeshConfig.Skeleton =  AnimationConfig.Skeleton;
		SkeletalMeshConfig.SkeletonConfig.CopyRotationsFrom =  AnimationConfig.Skeleton;
	}
	RemoveAllMeshes();
	const double LoadingStartTime = FPlatformTime::Seconds();
	const TArray<USceneComponent*> NewMeshComponents = LoadMeshComponents(GltfAsset);
	if (NewMeshComponents.Num() > 0)
	{
		LoadedMeshComponents.Append(NewMeshComponents);
		if(AnimationConfigsByStyleId.Contains(CharacterData.BaseModelId))
		{
			if (MasterPoseComponent == nullptr)
			{
				UE_LOG(LogPlayerZero, Error, TEXT("MasterPoseComponent is null for base model %s"), *CharacterData.BaseModelId);
				return;
			}

			if (!AnimationConfig.AnimationBlueprint)
			{
				UE_LOG(LogPlayerZero, Error, TEXT("AnimationBlueprint is null for base model %s"), *CharacterData.BaseModelId);
				return;
			}
			
			MasterPoseComponent->SetAnimationMode(EAnimationMode::AnimationBlueprint);
			MasterPoseComponent->SetAnimClass(AnimationConfig.AnimationBlueprint);
		}

		UE_LOG(LogPlayerZero, Log, TEXT("Asset loaded in %f seconds"), FPlatformTime::Seconds() - LoadingStartTime);
		return;
	}
	
	UE_LOG(LogPlayerZero, Error, TEXT("Failed to load mesh components"));
}


void APlayerZeroActor::RemoveAllMeshes()
{
	for (USceneComponent* ComponentToRemove : LoadedMeshComponents)
	{
		if (ComponentToRemove)
		{
			ComponentToRemove->DestroyComponent();
			ComponentToRemove = nullptr;
		}
	}
	LoadedMeshComponents.Empty();
}

TArray<USceneComponent*> APlayerZeroActor::LoadMeshComponents(UglTFRuntimeAsset* GltfAsset)
{
	TArray<FglTFRuntimeNode> AllNodes = GltfAsset->GetNodes();
	TArray<USceneComponent*> NewMeshComponents;
	
	bool bIsMasterPoseUpdateRequired = true;
	// Loop through all nodes to create mesh components
	for (const FglTFRuntimeNode& Node : AllNodes)
	{
		// Skip bones and armature
		if(GltfAsset->NodeIsBone(Node.Index) || Node.Name.Contains("Armature"))
		{
			continue;
		}
		
		if (Node.SkinIndex >= 0)
		{
			USkeletalMeshComponent* SkeletalMeshComponent = CreateSkeletalMeshComponent(GltfAsset, Node);
			if(bIsMasterPoseUpdateRequired)
			{
				UE_LOG( LogPlayerZero, Log, TEXT("Setting master pose component"));
				MasterPoseComponent = SkeletalMeshComponent;
				NewMeshComponents.Add(SkeletalMeshComponent);
				bIsMasterPoseUpdateRequired = false;
				continue;
			}
			SkeletalMeshComponent->SetMasterPoseComponent(MasterPoseComponent.Get());
			NewMeshComponents.Add(SkeletalMeshComponent);
		}
		else
		{
			NewMeshComponents.Add(CreateStaticMeshComponent(GltfAsset, Node));

		}
	}
	return NewMeshComponents;
}

USkeletalMeshComponent* APlayerZeroActor::CreateSkeletalMeshComponent(UglTFRuntimeAsset* GltfAsset, const FglTFRuntimeNode& Node)
{
	USkeletalMeshComponent* SkeletalMeshComponent = nullptr;

	if (SkeletalMeshConfig.bPerPolyCollision)
	{
		SkeletalMeshComponent = NewObject<UglTFRuntimeSkeletalMeshComponent>(this, GetSafeNodeName<UglTFRuntimeSkeletalMeshComponent>(Node));
		SkeletalMeshComponent->bEnablePerPolyCollision = true;
		SkeletalMeshComponent->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	}
	else
	{
		SkeletalMeshComponent = NewObject<USkeletalMeshComponent>(this, GetSafeNodeName<USkeletalMeshComponent>(Node));
	}

	USkeletalMesh* SkeletalMesh = GltfAsset->LoadSkeletalMesh(Node.MeshIndex, Node.SkinIndex, SkeletalMeshConfig);
	SkeletalMeshComponent->SetSkeletalMesh(SkeletalMesh);
	SkeletalMeshComponent->SetupAttachment(AssetRoot);
	SkeletalMeshComponent->SetRelativeTransform(Node.Transform);
	SkeletalMeshComponent->RegisterComponent();
	AddInstanceComponent(SkeletalMeshComponent);
	
	return SkeletalMeshComponent;
}

UStaticMeshComponent* APlayerZeroActor::CreateStaticMeshComponent(UglTFRuntimeAsset* GltfAsset, const FglTFRuntimeNode& Node)
{
	UStaticMeshComponent* StaticMeshComponent = nullptr;
	TArray<FTransform> GPUInstancingTransforms;

	if (GltfAsset->GetNodeGPUInstancingTransforms(Node.Index, GPUInstancingTransforms))
	{
		UInstancedStaticMeshComponent* InstancedStaticMeshComponent = NewObject<UInstancedStaticMeshComponent>(this, GetSafeNodeName<UInstancedStaticMeshComponent>(Node));
		for (const FTransform& GPUInstanceTransform : GPUInstancingTransforms)
		{
			InstancedStaticMeshComponent->AddInstance(GPUInstanceTransform);
		}
		StaticMeshComponent = InstancedStaticMeshComponent;
	}
	else
	{
		StaticMeshComponent = NewObject<UStaticMeshComponent>(this, GetSafeNodeName<UStaticMeshComponent>(Node));
	}
	
	UStaticMesh* StaticMesh = GltfAsset->LoadStaticMeshLODs({Node.MeshIndex}, StaticMeshConfig);
	StaticMeshComponent->SetStaticMesh(StaticMesh);
	StaticMeshComponent->SetupAttachment(AssetRoot);
	StaticMeshComponent->SetRelativeTransform(Node.Transform);
	StaticMeshComponent->RegisterComponent();
	AddInstanceComponent(StaticMeshComponent);
	
	return StaticMeshComponent;
}

void APlayerZeroActor::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
}
