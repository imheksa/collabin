// Copyright Ready Player Me

#include "AsyncActions/LoadAvatarGlbDataAsyncAction.h"
#include "Subsystems/PlayerZeroSubsystem.h"

ULoadAvatarGlbDataAsyncAction* ULoadAvatarGlbDataAsyncAction::LoadAvatarGlbDataAsync(UObject* WorldContextObject, const FString& Url, const FAvatarConfig& CharacterConfig)
{
	ULoadAvatarGlbDataAsyncAction* Node = NewObject<ULoadAvatarGlbDataAsyncAction>();
	Node->CachedUrl = Url;
	Node->ContextObject = WorldContextObject;
	Node->CharacterConfig = CharacterConfig;
	return Node;
}

void ULoadAvatarGlbDataAsyncAction::Activate()
{
	if (!ContextObject)
	{
		OnFailed.Broadcast();
		return;
	}

	if (const UWorld* World = ContextObject->GetWorld())
	{
		if (UPlayerZeroSubsystem* Subsystem = World->GetGameInstance()->GetSubsystem<UPlayerZeroSubsystem>())
		{
			Subsystem->DownloadAvatarData(CachedUrl, CharacterConfig, FOnAvatarDataDownloaded::CreateUObject(this, &ULoadAvatarGlbDataAsyncAction::OnDataDownloaded));
		}
	}
}

void ULoadAvatarGlbDataAsyncAction::OnDataDownloaded(const TArray<uint8>& Data)
{
	if (Data.Num() == 0)
	{
		OnFailed.Broadcast();
		return;
	}
	OnCompleted.Broadcast(Data);
}