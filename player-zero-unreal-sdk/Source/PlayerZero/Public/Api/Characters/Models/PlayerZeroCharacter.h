#pragma once

#include "CoreMinimal.h"
#include "PlayerZeroCharacter.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FPlayerZeroCharacter
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "id"))
	FString Id;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString BlueprintId;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "modelUrl"))
	FString ModelUrl;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "iconUrl"))
	FString IconUrl;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "assets"))
	TMap<FString, FString> Assets;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "createdAt"))
	FDateTime CreatedAt;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "updatedAt"))
	FDateTime UpdatedAt;
};
 