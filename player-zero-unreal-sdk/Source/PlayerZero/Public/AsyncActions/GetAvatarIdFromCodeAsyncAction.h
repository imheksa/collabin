// Copyright Ready Player Me

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "GetAvatarIdFromCodeAsyncAction.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGetAvatarCodeComplete, const FString&, AvatarId);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnGetAvatarCodeFailed);

/**
 * 
 */
UCLASS()
class PLAYERZERO_API UGetAvatarIdFromCodeAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable)
	FOnGetAvatarCodeComplete OnCompleted;
	
	UPROPERTY(BlueprintAssignable)
	FOnGetAvatarCodeFailed OnFailed;
	
	UFUNCTION(BlueprintCallable, Category = "Player Zero|Avatar", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = "true"))
	static UGetAvatarIdFromCodeAsyncAction* GetAvatarIdFromCodeAsync(UObject* WorldContextObject, const FString& AvatarCode);

	virtual void Activate() override;
	void HandleCompleted(const FString& AvatarId) const;

private:
	FString CachedAvatarCode;
	UObject* ContextObject;
};
