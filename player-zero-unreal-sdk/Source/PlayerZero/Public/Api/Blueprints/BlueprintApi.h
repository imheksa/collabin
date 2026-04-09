#pragma once
#include "Api/Common/WebApi.h"
#include "Models/BlueprintListRequest.h"
#include "Models/BlueprintListResponse.h"

DECLARE_DELEGATE_TwoParams(FBlueprintApiListResponse, const FBlueprintListResponse&, bool);

class PLAYERZERO_API FBlueprintApi : public FWebApi
{
public:
	FBlueprintApi();
	virtual ~FBlueprintApi() override;

	void ListAsync(const FBlueprintListRequest& Request, FBlueprintApiListResponse OnComplete);

private:
	FString BaseUrl;
};
