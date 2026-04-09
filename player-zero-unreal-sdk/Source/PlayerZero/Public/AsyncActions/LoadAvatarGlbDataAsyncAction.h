// Copyright Ready Player Me

#pragma once

#include "CoreMinimal.h"
#include "AvatarConfig.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "LoadAvatarGlbDataAsyncAction.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAvatarDataDownloadedBP, const TArray<uint8>&, Data);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnAvatarDataDownloadFailureBP);

UCLASS()
class PLAYERZERO_API ULoadAvatarGlbDataAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable)
	FOnAvatarDataDownloadedBP OnCompleted;

	UPROPERTY(BlueprintAssignable)
	FOnAvatarDataDownloadFailureBP OnFailed;

	UFUNCTION(BlueprintCallable, Category = "Player Zero|Avatar", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = true, AutoCreateRefTerm = "CharacterConfig"))
	static ULoadAvatarGlbDataAsyncAction* LoadAvatarGlbDataAsync(UObject* WorldContextObject, const FString& Url, const FAvatarConfig& CharacterConfig = FAvatarConfig());

	virtual void Activate() override;

private:
	FString CachedUrl;
	UObject* ContextObject;
	FAvatarConfig CharacterConfig;
	
	void OnDataDownloaded(const TArray<uint8>& Data);
};