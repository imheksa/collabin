// Copyright Ready Player Me

#include "AsyncActions/LoadGltfFromDataAsyncAction.h"
#include "Subsystems/PlayerZeroSubsystem.h"

ULoadGltfFromDataAsyncAction* ULoadGltfFromDataAsyncAction::LoadGltfFromDataAsync(UObject* WorldContextObject, const TArray<uint8>& GltfBinaryData, const FglTFRuntimeConfig& glTFRuntimeConfig)
{
	ULoadGltfFromDataAsyncAction* Node = NewObject<ULoadGltfFromDataAsyncAction>();
	Node->ContextObject = WorldContextObject;
	Node->Data = GltfBinaryData;
	Node->glTFRuntimeConfig = glTFRuntimeConfig;
	return Node;
}


void ULoadGltfFromDataAsyncAction::Activate()
{
	if (!ContextObject)
	{
		OnCompleted.Broadcast(nullptr);
		return;
	}

	if (const UWorld* World = ContextObject->GetWorld())
	{
		if (UPlayerZeroSubsystem* Subsystem = World->GetGameInstance()->GetSubsystem<UPlayerZeroSubsystem>())
		{
			Subsystem->LoadGltfAsset(Data, glTFRuntimeConfig, FOnGltfAssetLoaded::CreateUObject(this, &ULoadGltfFromDataAsyncAction::HandleCompleted));
		}
	}
}

void ULoadGltfFromDataAsyncAction::HandleCompleted(UglTFRuntimeAsset* GltfAsset) const
{
	OnCompleted.Broadcast(GltfAsset);
}
