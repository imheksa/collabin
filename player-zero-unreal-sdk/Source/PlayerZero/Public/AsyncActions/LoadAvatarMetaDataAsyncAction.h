// Copyright Ready Player Me

#pragma once

#include "CoreMinimal.h"
#include "Api/Characters/Models/PlayerZeroCharacter.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "LoadAvatarMetaDataAsyncAction.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAvatarMetaDataLoadedBP, const FPlayerZeroCharacter&, MetaData);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnAvatarMetaDataFailureBP);

UCLASS()
class PLAYERZERO_API ULoadAvatarMetaDataAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable)
	FOnAvatarMetaDataLoadedBP OnCompleted;

	UPROPERTY(BlueprintAssignable)
	FOnAvatarMetaDataFailureBP OnFailed;

	UFUNCTION(BlueprintCallable, Category = "Player Zero|Avatar", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = true))
	static ULoadAvatarMetaDataAsyncAction* LoadAvatarMetaDataAsync(UObject* WorldContextObject, const FString& AvatarId);

	virtual void Activate() override;

private:
	FString CachedAvatarId;
	UObject* ContextObject;

	void OnDataLoaded(const FPlayerZeroCharacter& Character);
};
