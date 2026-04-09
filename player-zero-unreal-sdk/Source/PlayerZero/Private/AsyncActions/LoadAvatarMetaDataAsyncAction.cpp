#include "AsyncActions/LoadAvatarMetaDataAsyncAction.h"
#include "Subsystems/PlayerZeroSubsystem.h"

ULoadAvatarMetaDataAsyncAction* ULoadAvatarMetaDataAsyncAction::LoadAvatarMetaDataAsync(UObject* WorldContextObject, const FString& AvatarId)
{
	ULoadAvatarMetaDataAsyncAction* Node = NewObject<ULoadAvatarMetaDataAsyncAction>();
	Node->CachedAvatarId = AvatarId;
	Node->ContextObject = WorldContextObject;
	return Node;
}

void ULoadAvatarMetaDataAsyncAction::Activate()
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
			Subsystem->GetAvatarMetaData(CachedAvatarId, FOnCharacterDataLoaded::CreateUObject(this, &ULoadAvatarMetaDataAsyncAction::OnDataLoaded));
		}
	}
}

void ULoadAvatarMetaDataAsyncAction::OnDataLoaded(const FPlayerZeroCharacter& Character)
{
	if (Character.Id.IsEmpty())
	{
		OnFailed.Broadcast();
		return;
	}
	OnCompleted.Broadcast(Character);
}
