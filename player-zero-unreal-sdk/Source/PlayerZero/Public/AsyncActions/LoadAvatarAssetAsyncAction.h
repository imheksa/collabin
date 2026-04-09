// Copyright Ready Player Me

#pragma once

#include "CoreMinimal.h"
#include "AvatarConfig.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "LoadAvatarAssetAsyncAction.generated.h"

class UglTFRuntimeAsset;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnAvatarGltfLoaded, UglTFRuntimeAsset*, GltfAsset);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnAvatarGltfLoadFailed);

/**
 * 
 */
UCLASS()
class PLAYERZERO_API ULoadAvatarAssetAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable)
	FOnAvatarGltfLoaded OnCompleted;
	
	UPROPERTY(BlueprintAssignable)
	FOnAvatarGltfLoadFailed OnFailed;
	
	UFUNCTION(BlueprintCallable, Category = "Player Zero|Avatar", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = true, AutoCreateRefTerm = "CharacterConfig"))
	static ULoadAvatarAssetAsyncAction* LoadAvatarAssetAsync(UObject* WorldContextObject, const FString& AvatarId, const FAvatarConfig& CharacterConfig = FAvatarConfig());

	virtual void Activate() override;
	void HandleCompleted(UglTFRuntimeAsset* GltfAsset) const;

private:
	FString CachedAvatarId;
	UObject* ContextObject;
	FAvatarConfig CharacterConfig;
};
