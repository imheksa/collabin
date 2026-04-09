#pragma once

#include "CoreMinimal.h"
#include "Api/Common/Models/ApiResponse.h"
#include "ApplicationListResponse.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FPlayerZeroApplication
{
	GENERATED_BODY()
	UPROPERTY(meta = (JsonName = "id"))
	FString Id;
	UPROPERTY(meta=(Jsonname = "name" ))
	FString Name;	
};

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FApplicationListResponse : public FApiResponse
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "API", meta = (JsonName = "data"))
	TArray<FPlayerZeroApplication> Data;
};
