#pragma once

#include "CoreMinimal.h"
#include "ApiResponse.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FApiResponse
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	bool IsSuccess = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	int64 Status = 200;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString Error;
};