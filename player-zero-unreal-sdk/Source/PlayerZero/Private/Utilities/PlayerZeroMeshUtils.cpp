// PlayerZeroMeshUtils.cpp

#include "Utilities/PlayerZeroMeshUtils.h"
#include "PlayerZero.h"
#include "Animation/Skeleton.h"
#include "Engine/SkeletalMesh.h"

void FPlayerZeroMeshUtils::LogSkeletonCompatibility(USkeletalMesh* Mesh, USkeleton* ExpectedSkeleton)
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
