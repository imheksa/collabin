// Fill out your copyright notice in the Description page of Project Settings.


#include "PlayerZeroFunctionLibrary.h"
#include "Subsystems/PlayerZeroSubsystem.h"
#include "Kismet/GameplayStatics.h"

FString UPlayerZeroFunctionLibrary::GetHotLoadedAvatarId(UObject* WorldContextObject)
{
	if (!WorldContextObject)
	{
		WorldContextObject = GEngine->GetWorldFromContextObjectChecked(WorldContextObject);
	}

	if (const UGameInstance* GameInstance = UGameplayStatics::GetGameInstance(WorldContextObject))
	{
		if (UPlayerZeroSubsystem* Subsystem = GameInstance->GetSubsystem<UPlayerZeroSubsystem>())
		{
			return Subsystem->GetAvatarId();
		}
	}
	return FString();
}
