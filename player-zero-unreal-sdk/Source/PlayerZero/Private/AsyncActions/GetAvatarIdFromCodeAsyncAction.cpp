// Copyright Ready Player Me

#include "AsyncActions/GetAvatarIdFromCodeAsyncAction.h"
#include "Subsystems/PlayerZeroSubsystem.h"

UGetAvatarIdFromCodeAsyncAction* UGetAvatarIdFromCodeAsyncAction::GetAvatarIdFromCodeAsync(UObject* WorldContextObject, const FString& AvatarCode)
{
	UGetAvatarIdFromCodeAsyncAction* Node = NewObject<UGetAvatarIdFromCodeAsyncAction>();
	Node->CachedAvatarCode = AvatarCode;
	Node->ContextObject = WorldContextObject;
	return Node;
}

void UGetAvatarIdFromCodeAsyncAction::Activate()
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
			Subsystem->GetAvatarFromAvatarCode(CachedAvatarCode, FOnAvatarCodeLoaded::CreateUObject(this, &UGetAvatarIdFromCodeAsyncAction::HandleCompleted));
		}
	}
}

void UGetAvatarIdFromCodeAsyncAction::HandleCompleted(const FString& AvatarId) const
{
	if (AvatarId.IsEmpty())
	{
		OnFailed.Broadcast();
		return;
	}
	OnCompleted.Broadcast(AvatarId);
}
