#pragma once

#include "CoreMinimal.h"
#include "PaginationQueryParams.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FPaginationQueryParams
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "limit"))
	int Limit = 10;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "page"))
	int Page = -1;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "order"))
	FString Order;
};
