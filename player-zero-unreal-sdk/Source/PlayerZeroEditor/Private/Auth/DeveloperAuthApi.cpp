#include "Auth/DeveloperAuthApi.h"

#include "Api/Common/WebApiHelpers.h"
#include "Auth/Models/DeveloperLoginRequest.h"
#include "Auth/Models/DeveloperLoginResponse.h"
#include "Interfaces/IHttpResponse.h"
#include "Settings/PlayerZeroDeveloperSettings.h"

FDeveloperAuthApi::FDeveloperAuthApi()
{
	const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
	ApiUrl = FString::Printf(TEXT("%s/login"), *PlayerZeroSettings->ApiBaseAuthUrl);
}

void FDeveloperAuthApi::LoginWithEmail(FDeveloperLoginRequest Request, FOnDeveloperLoginResponse OnComplete)
{
	const TSharedPtr<FApiRequest> ApiRequest = MakeShared<FApiRequest>();
	ApiRequest->Url = ApiUrl;
	ApiRequest->Method = POST;
	ApiRequest->Headers.Add(TEXT("Content-Type"), TEXT("application/json"));
	ApiRequest->Payload = Request.ToJsonString();
	ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
		[this, OnComplete](TSharedPtr<FApiRequest> Req, FHttpResponsePtr Response, bool bWasSuccessful)
		{
			FDeveloperLoginResponse ParsedResponse;
			if (bWasSuccessful && TryParseJsonResponse(Response, ParsedResponse))
			{
				OnComplete.ExecuteIfBound(ParsedResponse, true);
				return;
			}
			UE_LOG(LogPlayerZero, Warning, TEXT("Login with email request failed."));
			OnComplete.ExecuteIfBound(ParsedResponse, bWasSuccessful);

		});
	DispatchRaw(ApiRequest);
}
