#pragma once

#include "CoreMinimal.h"
#include "PlayerZeroCharacterTypes.h"
#include "AvatarRenderConfig.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FAvatarRenderConfig
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ERenderSize Size = ERenderSize::Size_512;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config", meta = (ToolTip = "Applies only to the non transparent images"))
	EAvatarRenderQuality Quality = EAvatarRenderQuality::High;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	bool bIsTransparent = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config", meta = (ToolTip = "Applies only to the non transparent images"))
	FColor Background = FColor::White;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ERenderExpression Expression = ERenderExpression::None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ERenderPose Pose = ERenderPose::Default;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	ERenderScene Scene;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Config")
	FString CustomScene;
};