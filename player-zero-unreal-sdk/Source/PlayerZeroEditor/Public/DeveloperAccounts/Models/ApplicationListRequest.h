#pragma once

#include "CoreMinimal.h"
#include "Api/Common/Models/ApiRequest.h"
#include "ApplicationListRequest.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FApplicationListRequest : public FApiRequest
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "API")
	TMap<FString, FString> Params;
};
