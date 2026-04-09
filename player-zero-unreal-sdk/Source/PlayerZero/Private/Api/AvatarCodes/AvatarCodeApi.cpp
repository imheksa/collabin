#include "Api/AvatarCodes/AvatarCodeApi.h"

#include "PlayerZero.h"
#include "Api/AvatarCodes/Models/AvatarCodeResponse.h"
#include "Settings/PlayerZeroDeveloperSettings.h"
#include "Api/Common/WebApi.h"
#include "Api/Common/WebApiHelpers.h"

FAvatarCodeApi::FAvatarCodeApi()
{
	const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
	ApiUrl = FString::Printf(TEXT("%s/v3/avatars/code"), *PlayerZeroSettings->GetApiBaseUrl());
}

void FAvatarCodeApi::GetAvatarCode(const FString& AvatarCode, FOnAvatarCodeResponse OnComplete)
{
	TSharedPtr<FApiRequest> ApiRequest = MakeShared<FApiRequest>();
	ApiRequest->Url =  FString::Printf(TEXT("%s/%s" ), *ApiUrl, *AvatarCode);
	ApiRequest->Method = GET;
	ApiRequest->Headers.Add(TEXT("Content-Type"), TEXT("application/json"));
	TSharedPtr<FAvatarCodeApi> SharedThis = StaticCastSharedRef<FAvatarCodeApi>(AsShared());
	ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
		[SharedThis, OnComplete](TSharedPtr<FApiRequest> Request, FHttpResponsePtr Response, bool bSuccess)
		{
			if (!SharedThis.IsValid())
			{
				UE_LOG(LogPlayerZero, Warning, TEXT("FAvatarCodeApi is no longer valid when processing HTTP response to URL: %s"), *Request->Url);
				return;
			}

			if (bSuccess && Response.IsValid() && EHttpResponseCodes::IsOk(Response->GetResponseCode()))
			{
				FAvatarCodeResponse ParsedResponse;
				if (TryParseJsonResponse(Response, ParsedResponse))
				{
					OnComplete.ExecuteIfBound(ParsedResponse, true);
					return;
				}
			}
			OnComplete.ExecuteIfBound(FAvatarCodeResponse(), false);
		});
	DispatchRaw(ApiRequest);
}
