// Copyright Ready Player Me

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "glTFRuntimeAsset.h"
#include "glTFRuntimeParser.h"
#include "LoadGltfFromDataAsyncAction.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGltfFromDataLoaded, UglTFRuntimeAsset*, GltfAsset);

UCLASS()
class PLAYERZERO_API ULoadGltfFromDataAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable)
	FOnGltfFromDataLoaded OnCompleted;

	UFUNCTION(BlueprintCallable, Category = "Player Zero|Avatar", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = true, AutoCreateRefTerm = "glTFRuntimeConfig"))
	static ULoadGltfFromDataAsyncAction* LoadGltfFromDataAsync(UObject* WorldContextObject, const TArray<uint8>& GltfBinaryData, const FglTFRuntimeConfig& glTFRuntimeConfig = FglTFRuntimeConfig());

	virtual void Activate() override;
	
	void HandleCompleted(UglTFRuntimeAsset* GltfAsset) const;
private:
	UObject* ContextObject;
	TArray<uint8> Data;
	FglTFRuntimeConfig glTFRuntimeConfig;
};