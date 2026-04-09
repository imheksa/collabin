#pragma once

#include "CoreMinimal.h"
#include "PlayerZeroCharacterTypes.h"
#include "Engine/DataAsset.h"
#include "AvatarConfig.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FAvatarConfig 
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	EMeshLod MeshLod = EMeshLod::High;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ETextureAtlas TextureAtlas = ETextureAtlas::High;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ETextureQuality TextureQuality = ETextureQuality::High;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ETextureSizeLimit TextureSizeLimit = ETextureSizeLimit::Limit_1024;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	TSet<ETextureChannel> TextureChannels = { ETextureChannel::BaseColor, ETextureChannel::Normal, ETextureChannel::MetallicRoughness, ETextureChannel::Emissive, ETextureChannel::Occlusion };

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	TSet<EAvatarMorphTarget> MorphTargets;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	TSet<EMorphTargetGroups> MorphTargetGroups;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	bool bUseMeshOptCompression = false;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	bool bUseDracoMeshCompression = false;
};
