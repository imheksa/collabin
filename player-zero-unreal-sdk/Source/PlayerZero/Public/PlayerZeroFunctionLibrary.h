// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Kismet/GameplayStatics.h"
#include "PlayerZeroFunctionLibrary.generated.h"

class UImage;
class UPlayerZeroSubsystem;

/**
 * 
 */
UCLASS()
class PLAYERZERO_API UPlayerZeroFunctionLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "Player Zero", meta = (WorldContext = "WorldContextObject"))
	static FString GetHotLoadedAvatarId(UObject* WorldContextObject = nullptr);

};
