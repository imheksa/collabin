// Fill out your copyright notice in the Description page of Project Settings.

#include "Settings/PlayerZeroDeveloperSettings.h"
#include "UObject/ObjectSaveContext.h"

UPlayerZeroDeveloperSettings::UPlayerZeroDeveloperSettings() : ApiBaseUrl(TEXT("https://api.readyplayer.me")), ApiBaseAuthUrl(TEXT("https://readyplayer.me/api/auth")), DefaultAvatarId((TEXT("688b3deec85bec2f31fd6d6d")))
{
	LoadConfig();
}

void UPlayerZeroDeveloperSettings::PostInitProperties()
{
	Super::PostInitProperties();
}

void UPlayerZeroDeveloperSettings::PreSave(FObjectPreSaveContext SaveContext)
{
	Super::PreSave(SaveContext);

	if (!ApplicationId.IsEmpty())
	{
		return;
	}

	SaveConfig(CPF_Config, *GetDefaultConfigFilename());
}

#if WITH_EDITOR
void UPlayerZeroDeveloperSettings::PostEditChangeProperty(FPropertyChangedEvent& PropertyChangedEvent)
{
	Super::PostEditChangeProperty(PropertyChangedEvent);
	SaveConfig(CPF_Config, *GetDefaultConfigFilename());
}
#endif // WITH_EDITOR

FString UPlayerZeroDeveloperSettings::GetApiBaseUrl() const
{
	return ApiBaseUrl;
}
