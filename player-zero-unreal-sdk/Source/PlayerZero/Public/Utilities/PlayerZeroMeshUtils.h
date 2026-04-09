#pragma once

#include "CoreMinimal.h"

class USkeletalMesh;
class USkeleton;

class PLAYERZERO_API FPlayerZeroMeshUtils
{
public:
	static void LogSkeletonCompatibility(USkeletalMesh* Mesh, USkeleton* ExpectedSkeleton);
};