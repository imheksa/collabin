// Copyright Ready Player Me

#include "AsyncActions/LoadAvatarAssetAsyncAction.h"
#include "Subsystems/PlayerZeroSubsystem.h"

ULoadAvatarAssetAsyncAction* ULoadAvatarAssetAsyncAction::LoadAvatarAssetAsync(UObject* WorldContextObject, const FString& AvatarId, const FAvatarConfig& CharacterConfig)
{
	ULoadAvatarAssetAsyncAction* Node = NewObject<ULoadAvatarAssetAsyncAction>();
	Node->CachedAvatarId = AvatarId;
	Node->ContextObject = WorldContextObject;
	Node->CharacterConfig = CharacterConfig;
	return Node;
}

void ULoadAvatarAssetAsyncAction::Activate()
{
	if (!ContextObject)
	{
		OnFailed.Broadcast();
		return;
	}

	if (UWorld* World = ContextObject->GetWorld())
	{
		if (UPlayerZeroSubsystem* Subsystem = World->GetGameInstance()->GetSubsystem<UPlayerZeroSubsystem>())
		{
			Subsystem->LoadAvatarAsset(CachedAvatarId, CharacterConfig, FOnGltfAssetLoaded::CreateUObject(this, &ULoadAvatarAssetAsyncAction::HandleCompleted));
		}
	}
}

void ULoadAvatarAssetAsyncAction::HandleCompleted(UglTFRuntimeAsset* GltfAsset) const
{
	if (!GltfAsset)
	{
		OnFailed.Broadcast();
		return;
	}
	OnCompleted.Broadcast(GltfAsset);
}
