#include "PlayerZeroConfigProcessor.h"

#include "AvatarRenderConfig.h"
#include "Utilities/PluginInfo.h"
#include "PlayerZeroCharacterTypes.h"
#include "AvatarConfig.h"
#include "Kismet/KismetStringLibrary.h"
#include "Utilities/MorphTargetUtilities.h"

static const TMap<ETextureAtlas, FString> TEXTURE_ATLAS_TO_STRING =
{
	{ ETextureAtlas::None, "none" },
	{ ETextureAtlas::High, "1024" },
	{ ETextureAtlas::Medium, "512" },
	{ ETextureAtlas::Low, "256" }
};

static const TMap<ETextureQuality, FString> TEXTURE_QUALITY_TO_STRING =
{
	{ ETextureQuality::High, "high" },
	{ ETextureQuality::Medium, "medium" },
	{ ETextureQuality::Low, "low" }
};

static const TMap<ETextureChannel, FString> TEXTURE_CHANNEL_TO_STRING =
{
	{ ETextureChannel::BaseColor, "baseColor" },
	{ ETextureChannel::Normal, "normal" },
	{ ETextureChannel::MetallicRoughness, "metallicRoughness" },
	{ ETextureChannel::Emissive, "emissive" },
	{ ETextureChannel::Occlusion, "occlusion" }
};

static const TMap<ETextureSizeLimit, FString> TEXTURE_SIZE_LIMIT_TO_STRING =
{
	{ ETextureSizeLimit::Limit_1024, "1024" },
	{ ETextureSizeLimit::Limit_512, "512" },
	{ ETextureSizeLimit::Limit_256, "256" }
};

static const TMap<ERenderExpression,FString> EXPRESSION_TO_STRING_MAP =
{
	{ERenderExpression::Happy, "happy"},
	{ERenderExpression::Lol, "lol"},
	{ERenderExpression::Sad, "sad"},
	{ERenderExpression::Scared, "scared"},
	{ERenderExpression::Rage, "rage"}
};

static const TMap<ERenderPose,FString> POSE_TO_STRING_MAP =
{
	{ERenderPose::Default, "default"},
	{ERenderPose::Dancing, "dancing"},
	{ERenderPose::Athlete, "athlete"},
	{ERenderPose::Defending, "defending"},
	{ERenderPose::Fighting, "fighting"},
	{ERenderPose::Shrugging, "shrugging"},
	{ERenderPose::Standing, "standing"},
	{ERenderPose::Standing2, "standing2"},
	{ERenderPose::Standing3, "standing3"},
	{ERenderPose::Sitting, "sitting"},
};

static const TMap<ERenderSize, FString> RENDER_SIZE_TO_STRING =
{
	{ ERenderSize::Size_64, "64" },
	{ ERenderSize::Size_128, "128" },
	{ ERenderSize::Size_256, "256" },
	{ ERenderSize::Size_512, "512" },
	{ ERenderSize::Size_1024, "1024" }
};

static const TMap<EAvatarRenderQuality, FString> RENDER_QUALITY_TO_STRING =
{
	{ EAvatarRenderQuality::Low, "low" },
	{ EAvatarRenderQuality::Medium, "medium" },
	{ EAvatarRenderQuality::High, "high" }
};

static const TMap<ERenderScene, FString> RENDER_SCENE_TO_STRING =
{
	{ ERenderScene::Fullbody, "default-Nova-render-scene-fullbody" },
	{ ERenderScene::Portrait, "default-Nova-render-scene-portrait-closeup" },
	{ ERenderScene::Custom, "custom" }
};

namespace
{
	FString ProcessTextureChannels(const TSet<ETextureChannel>& TextureChannels)
	{
		if (TextureChannels.Num() == 0)
		{
			return "none";
		}
		TArray<FString> ChannelStrList;
		for (const auto& Channel : TextureChannels)
		{
			ChannelStrList.Add(TEXTURE_CHANNEL_TO_STRING[Channel]);
		}
		return FString::Join(ChannelStrList, TEXT(","));
	}

	FString ProcessMorphTargets(const TSet<EMorphTargetGroups>& MorphTargetGroups, const TSet<EAvatarMorphTarget>& MorphTargets)
	{
		if (MorphTargetGroups.Num() == 0 && MorphTargets.Num() == 0)
		{
			return "";
		}
		TArray<FString> Morphs;
		for (const auto& Group : MorphTargetGroups)
		{
			Morphs.Add(FMorphTargetUtilities::MorphTargetGroupToString(Group));
		}
		for (const auto& Target : MorphTargets)
		{
			Morphs.Add(FMorphTargetUtilities::MorphTargetToString(Target));
		}
		return "morphTargets=" + FString::Join(Morphs, TEXT(","));
	}
}

FString FPlayerZeroConfigProcessor::ProcessCharacter(const FAvatarConfig& Config)
{
	const bool UseDraco = FPluginInfo::IsDracoPluginIncluded() && Config.bUseDracoMeshCompression;
	const FString MorphTargetsParam = ProcessMorphTargets(Config.MorphTargetGroups, Config.MorphTargets);
	TArray<FString> Parameters;
Parameters.Add("textureQuality=" + TEXTURE_QUALITY_TO_STRING[Config.TextureQuality]);
	Parameters.Add("meshLOD=" + FString::FromInt(static_cast<int>(Config.MeshLod)));
	Parameters.Add("textureAtlas=" + TEXTURE_ATLAS_TO_STRING[Config.TextureAtlas]);
	Parameters.Add("textureSizeLimit=" + TEXTURE_SIZE_LIMIT_TO_STRING[Config.TextureSizeLimit]);
	Parameters.Add("textureChannels=" + ProcessTextureChannels(Config.TextureChannels));
	if (!MorphTargetsParam.IsEmpty())
	{
		Parameters.Add(MorphTargetsParam);
	}
	Parameters.Add("meshCompression=" + UKismetStringLibrary::Conv_BoolToString(Config.bUseMeshOptCompression));
	Parameters.Add("dracoCompression=" + UKismetStringLibrary::Conv_BoolToString(UseDraco));
	return "?" + FString::Join(Parameters, TEXT("&"));
}

FString FPlayerZeroConfigProcessor::ProcessRender(const FAvatarRenderConfig& Config)
{
	TArray<FString> Parameters;
	Parameters.Add("size=" + RENDER_SIZE_TO_STRING[Config.Size]);
	Parameters.Add("quality=" + RENDER_QUALITY_TO_STRING[Config.Quality]);
	Parameters.Add("pose=" + POSE_TO_STRING_MAP[Config.Pose]);
	Parameters.Add("scene=" + RENDER_SCENE_TO_STRING[Config.Scene]);
	if (!Config.bIsTransparent)
	{
		Parameters.Add(FString::Format(TEXT("background={0},{1},{2}"),
		{FString::FromInt(Config.Background.R), FString::FromInt(Config.Background.G), FString::FromInt(Config.Background.B)}));
	}
	if (Config.Expression != ERenderExpression::None)
	{
		Parameters.Add("expression=" + EXPRESSION_TO_STRING_MAP[Config.Expression]);
	}

	return "?" + FString::Join(Parameters, TEXT("&"));
}
