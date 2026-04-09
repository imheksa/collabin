#include "Api/Characters/CharacterApi.h"
#include "HttpModule.h"
#include "PlayerZero.h"
#include "Api/Characters/Models/CharacterFindByIdRequest.h"
#include "Api/Common/WebApiHelpers.h"
#include "Interfaces/IHttpResponse.h"
#include "Settings/PlayerZeroDeveloperSettings.h"

FCharacterApi::FCharacterApi()
{
	const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
	BaseUrl = FString::Printf(TEXT("%s/v1/characters"), *PlayerZeroSettings->GetApiBaseUrl());
}

FCharacterApi::~FCharacterApi()
{
}

void FCharacterApi::FindByIdAsync(const FCharacterFindByIdRequest& Request, FOnCharacterFindResponse OnComplete)
{
	TSharedPtr<FApiRequest> ApiRequest = MakeShared<FApiRequest>();
	ApiRequest->Url = FString::Printf(TEXT("%s/%s"), *BaseUrl, *Request.Id);
	ApiRequest->Method = GET;
	ApiRequest->Headers.Add(TEXT("Content-Type"), TEXT("application/json"));
	
	TSharedPtr<FCharacterApi> SharedThis = StaticCastSharedRef<FCharacterApi>(AsShared());
	ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
		[SharedThis, OnComplete](TSharedPtr<FApiRequest> Req, FHttpResponsePtr Response, bool bSuccess)
		{
			if (!SharedThis.IsValid())
			{
				return;
			}
			FCharacterFindByIdResponse ParsedResponse;
			if (bSuccess && TryParseJsonResponse(Response, ParsedResponse))
			{
				UE_LOG(LogPlayerZero, Warning, TEXT("Character FIND request SUCCESS."));
				OnComplete.ExecuteIfBound(ParsedResponse, true);
				return;
			}
			UE_LOG(LogPlayerZero, Warning, TEXT("Character FIND request failed."));
			OnComplete.ExecuteIfBound(FCharacterFindByIdResponse(), false);
		});
	DispatchRaw(ApiRequest);
}


