#pragma once
#include "CharacterBlueprint.h"
#include "Api/Common/Models/ApiResponse.h"
#include "Api/Common/Models/Pagination.h"
#include "BlueprintListResponse.generated.h"


USTRUCT(BlueprintType)
struct PLAYERZERO_API FBlueprintListResponse : public FApiResponse
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "data"))
	TArray<FCharacterBlueprint> Data;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "pagination"))
	FPagination Pagination;
	
};
