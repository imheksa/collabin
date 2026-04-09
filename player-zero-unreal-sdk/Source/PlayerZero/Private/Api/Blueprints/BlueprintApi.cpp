#include "Api/Blueprints/BlueprintApi.h"
#include "PlayerZero.h"
#include "Api/Common/WebApiHelpers.h"
#include "Interfaces/IHttpResponse.h"
#include "Settings/PlayerZeroDeveloperSettings.h"

FBlueprintApi::FBlueprintApi()
{
	const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
	BaseUrl = FString::Printf(TEXT("%s/v1/public/blueprints"), *PlayerZeroSettings->GetApiBaseUrl());
}

FBlueprintApi::~FBlueprintApi()
{
}

void FBlueprintApi::ListAsync(const FBlueprintListRequest& Request, FBlueprintApiListResponse OnComplete)
{
	const FString ArchivedStr = Request.Archived ? TEXT("true") : TEXT("false");
	TSharedPtr<FApiRequest> RequestPtr = MakeShared<FApiRequest>();
	RequestPtr->Url = FString::Printf(TEXT("%s?applicationId=%s&archived=%s"), *BaseUrl, *Request.ApplicationId, *ArchivedStr);
	RequestPtr->Method = GET;
	RequestPtr->Headers.Add(TEXT("Content-Type"), TEXT("application/json"));
	TSharedPtr<FBlueprintApi> SharedThis = StaticCastSharedRef<FBlueprintApi>(AsShared());

	RequestPtr->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
		[SharedThis, OnComplete](TSharedPtr<FApiRequest> ApiRequest, FHttpResponsePtr Response, bool bSuccess)
		{
			if (!SharedThis.IsValid())
			{
				return;
			}
			FBlueprintListResponse ParsedResponse;
			if (bSuccess && TryParseJsonResponse(Response, ParsedResponse))
			{
				OnComplete.ExecuteIfBound(ParsedResponse, true);
				return;
			}
			UE_LOG(LogPlayerZero, Warning, TEXT("Blueprint LIST request failed."));
			OnComplete.ExecuteIfBound(FBlueprintListResponse(), false);
		});
	
	DispatchRaw(RequestPtr);
}
