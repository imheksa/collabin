#pragma once

#include "CoreMinimal.h"
#include "Api/Common/Models/ApiResponse.h"
#include "Api/Common/WebApiWithAuth.h"
#include "OrganizationListResponse.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FOrganization
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (JsonName = "id"))
	FString Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (JsonName = "name"))
	FString Name;	
};

USTRUCT(BlueprintType)
struct PLAYERZEROEDITOR_API FOrganizationListResponse : public FApiResponse
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "API", meta = ( JsonName = "data"))
	TArray<FOrganization> Data;
};
