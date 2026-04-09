#pragma once

#include "CoreMinimal.h"
#include "Pagination.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FPagination
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "totalDocs"))
	int TotalDocs = 0;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "limit"))
	int Limit = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "totalPages"))
	int TotalPages = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "page"))
	int Page = 0;
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "pagingCounter"))
	int PagingCounter = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "hasPrevPage"))
	bool HasPrevPage = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "hasNextPage"))
	bool HasNextPage = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "prevPage"))
	int PrevPage = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "nextPage"))
	int NextPage = 0;
};
