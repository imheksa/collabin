#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "PlayerZeroCharacterTypes.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FPlayerZeroAnimationConfig
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero" )
	USkeleton* Skeleton;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	TSubclassOf<UAnimInstance> AnimationBlueprint;

	FPlayerZeroAnimationConfig()
	{
		Skeleton = nullptr;
		AnimationBlueprint = nullptr;
	}
};

USTRUCT(BlueprintType)
struct PLAYERZERO_API FPlayerZeroCharacterData
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString Id;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString BaseModelId;

	FPlayerZeroCharacterData()
	{
		Id = "";
		BaseModelId = "";
	}
};

UENUM(BlueprintType)
enum class EMeshLod : uint8
{
	High UMETA(DisplayName = "High (0)"),
	Medium UMETA(DisplayName = "Medium (1)"),
	Low UMETA(DisplayName = "Low (2)")
};

UENUM(BlueprintType)
enum class ETextureAtlas : uint8
{
	None UMETA(DisplayName = "None"),
	High UMETA(DisplayName = "High (1024)"),
	Medium UMETA(DisplayName = "Medium (512)"),
	Low UMETA(DisplayName = "Low (256)")
};

UENUM(BlueprintType)
enum class ETextureQuality : uint8
{
	High UMETA(DisplayName = "High"),
	Medium UMETA(DisplayName = "Medium"),
	Low UMETA(DisplayName = "Low")
};

UENUM(BlueprintType)
enum class ETextureSizeLimit : uint8
{
	Limit_1024 UMETA(DisplayName = "1024"),
	Limit_512 UMETA(DisplayName = "512"),
	Limit_256 UMETA(DisplayName = "256")
};

UENUM(BlueprintType)
enum class ETextureChannel : uint8
{
	BaseColor UMETA(DisplayName = "Base Color"),
	Normal UMETA(DisplayName = "Normal"),
	MetallicRoughness UMETA(DisplayName = "Metallic Roughness"),
	Emissive UMETA(DisplayName = "Emissive"),
	Occlusion UMETA(DisplayName = "Occlusion")
};

UENUM(BlueprintType)
enum class EMorphTargetGroups : uint8
{
	None UMETA(DisplayName = "None"),
	ArKit UMETA(DisplayName = "ArKit"),
	Oculus UMETA(DisplayName = "Oculus Viseme"),
	EyesExtra UMETA(DisplayName = "Eyes Extra"),
	BasicExpressions UMETA(DisplayName = "Basic Expressions")
};

UENUM(BlueprintType)
enum class EAvatarMorphTarget : uint8
{
	// Oculus Viseme blend shapes
	Viseme_aa UMETA(DisplayName = "Viseme_aa"),
	Viseme_E UMETA(DisplayName = "Viseme_E"),
	Viseme_I UMETA(DisplayName = "Viseme_I"),
	Viseme_O UMETA(DisplayName = "Viseme_O"),
	Viseme_U UMETA(DisplayName = "Viseme_U"),
	Viseme_CH UMETA(DisplayName = "Viseme_CH"),
	Viseme_DD UMETA(DisplayName = "Viseme_DD"),
	Viseme_FF UMETA(DisplayName = "Viseme_FF"),
	Viseme_kk UMETA(DisplayName = "Viseme_kk"),
	Viseme_nn UMETA(DisplayName = "Viseme_nn"),
	Viseme_PP UMETA(DisplayName = "Viseme_PP"),
	Viseme_RR UMETA(DisplayName = "Viseme_RR"),
	Viseme_sil UMETA(DisplayName = "Viseme_sil"),
	Viseme_SS UMETA(DisplayName = "Viseme_SS"),
	Viseme_TH UMETA(DisplayName = "Viseme_TH"),

	// ArKit blend shapes
	BrowDownLeft UMETA(DisplayName = "BrowDownLeft"),
	BrowDownRight UMETA(DisplayName = "BrowDownRight"),
	BrowInnerUp UMETA(DisplayName = "BrowInnerUp"),
	BrowOuterUpLeft UMETA(DisplayName = "BrowOuterUpLeft"),
	BrowOuterUpRight UMETA(DisplayName = "BrowOuterUpRight"),
	EyeBlinkLeft UMETA(DisplayName = "EyeBlinkLeft"),
	EyeBlinkRight UMETA(DisplayName = "EyeBlinkRight"),
	EyeSquintLeft UMETA(DisplayName = "EyeSquintLeft"),
	EyeSquintRight UMETA(DisplayName = "EyeSquintRight"),
	EyeWideLeft UMETA(DisplayName = "EyeWideLeft"),
	EyeWideRight UMETA(DisplayName = "EyeWideRight"),
	JawOpen UMETA(DisplayName = "JawOpen"),
	JawForward UMETA(DisplayName = "JawForward"),
	JawLeft UMETA(DisplayName = "JawLeft"),
	JawRight UMETA(DisplayName = "JawRight"),
	NoseSneerLeft UMETA(DisplayName = "NoseSneerLeft"),
	NoseSneerRight UMETA(DisplayName = "NoseSneerRight"),
	CheekPuff UMETA(DisplayName = "CheekPuff"),
	CheekSquintLeft UMETA(DisplayName = "CheekSquintLeft"),
	CheekSquintRight UMETA(DisplayName = "CheekSquintRight"),
	MouthSmileLeft UMETA(DisplayName = "MouthSmileLeft"),
	MouthSmileRight UMETA(DisplayName = "MouthSmileRight"),
	MouthLeft UMETA(DisplayName = "MouthLeft"),
	MouthRight UMETA(DisplayName = "MouthRight"),
	MouthClose UMETA(DisplayName = "MouthClose"),
	MouthFunnel UMETA(DisplayName = "MouthFunnel"),
	MouthDimpleLeft UMETA(DisplayName = "MouthDimpleLeft"),
	MouthDimpleRight UMETA(DisplayName = "MouthDimpleRight"),
	MouthStretchLeft UMETA(DisplayName = "MouthStretchLeft"),
	MouthStretchRight UMETA(DisplayName = "MouthStretchRight"),
	MouthRollLower UMETA(DisplayName = "MouthRollLower"),
	MouthRollUpper UMETA(DisplayName = "MouthRollUpper"),
	MouthPressLeft UMETA(DisplayName = "MouthPressLeft"),
	MouthPressRight UMETA(DisplayName = "MouthPressRight"),
	MouthUpperUpLeft UMETA(DisplayName = "MouthUpperUpLeft"),
	MouthUpperUpRight UMETA(DisplayName = "MouthUpperUpRight"),
	MouthFrownLeft UMETA(DisplayName = "MouthFrownLeft"),
	MouthFrownRight UMETA(DisplayName = "MouthFrownRight"),
	MouthPucker UMETA(DisplayName = "MouthPucker"),
	MouthShrugLower UMETA(DisplayName = "MouthShrugLower"),
	MouthShrugUpper UMETA(DisplayName = "MouthShrugUpper"),
	MouthLowerDownLeft UMETA(DisplayName = "MouthLowerDownLeft"),
	MouthLowerDownRight UMETA(DisplayName = "MouthLowerDownRight"),

	// Additional blend shapes
	MouthOpen UMETA(DisplayName = "MouthOpen"),
	MouthSmile UMETA(DisplayName = "MouthSmile"),
	EyesClosed UMETA(DisplayName = "EyesClosed"),
	EyesLookUp UMETA(DisplayName = "EyesLookUp"),
	EyesLookDown UMETA(DisplayName = "EyesLookDown"),

	EyeLookDownLeft UMETA(DisplayName = "EyeLookDownLeft"),
	EyeLookInLeft UMETA(DisplayName = "EyeLookInLeft"),
	EyeLookOutLeft UMETA(DisplayName = "EyeLookOutLeft"),
	EyeLookUpLeft UMETA(DisplayName = "EyeLookUpLeft"),
	EyeLookDownRight UMETA(DisplayName = "EyeLookDownRight"),
	EyeLookInRight UMETA(DisplayName = "EyeLookInRight"),
	EyeLookOutRight UMETA(DisplayName = "EyeLookOutRight"),
	EyeLookUpRight UMETA(DisplayName = "EyeLookUpRight"),
	TongueOut UMETA(DisplayName = "TongueOut"),
};

UENUM(BlueprintType)
enum class ERenderExpression : uint8
{
	None,
	Happy,
	Lol,
	Sad,
	Scared,
	Rage
};

UENUM(BlueprintType)
enum class ERenderPose : uint8
{
	Dancing,
	Default,
	Athlete,
	Defending,
	Fighting,
	Shrugging,
	Standing,
	Standing2,
	Standing3,
	Sitting
};

UENUM(BlueprintType)
enum class ERenderSize : uint8
{
	Size_64 UMETA(DisplayName = "64"),
	Size_128 UMETA(DisplayName = "128"),
	Size_256 UMETA(DisplayName = "256"),
	Size_512 UMETA(DisplayName = "512"),
	Size_1024 UMETA(DisplayName = "1024")
};

UENUM(BlueprintType)
enum class EAvatarRenderQuality : uint8
{
	Low,
	Medium,
	High
};

UENUM(BlueprintType)
enum class ERenderScene : uint8
{
	Fullbody,
	Portrait,
	Custom,
};
