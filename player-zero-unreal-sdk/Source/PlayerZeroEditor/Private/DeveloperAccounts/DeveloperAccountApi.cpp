#include "DeveloperAccounts/DeveloperAccountApi.h"
#include "JsonObjectConverter.h"
#include "PlayerZero.h"
#include "Api/Auth/AuthApi.h"
#include "Api/Auth/Models/RefreshTokenRequest.h"
#include "Auth/DevAuthTokenCache.h"
#include "Auth/Models/DeveloperAuth.h"
#include "DeveloperAccounts/Models/ApplicationListRequest.h"
#include "DeveloperAccounts/Models/ApplicationListResponse.h"
#include "DeveloperAccounts/Models/OrganizationListRequest.h"
#include "DeveloperAccounts/Models/OrganizationListResponse.h"
#include "Interfaces/IHttpResponse.h"
#include "Settings/PlayerZeroDeveloperSettings.h"

FDeveloperAccountApi::FDeveloperAccountApi()
{
    if (UPlayerZeroDeveloperSettings* Settings = GetMutableDefault<UPlayerZeroDeveloperSettings>())
    {
        ApiBaseUrl = Settings->GetApiBaseUrl();
    }
    
    AuthApi = MakeShared<FAuthApi>();
}

void FDeveloperAccountApi::AddAuthToRequest(TSharedPtr<FApiRequest> ApiRequest) 
{
    const FString Key = TEXT("Authorization");
    const FString Token = FDevAuthTokenCache::GetAuthData().Token;
    if(Token.IsEmpty())
    {
        UE_LOG(LogPlayerZero, Error, TEXT("Token is empty"));

        ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
            [this](TSharedPtr<FApiRequest> Req, FHttpResponsePtr Response, bool bSuccess)
            {
                OnAuthComplete(Req, false);
            });
        return;
    }
    if (ApiRequest->Headers.Contains(Key))
    {
        ApiRequest->Headers.Remove(Key);
    }
    ApiRequest->Headers.Add(Key, FString::Printf(TEXT("Bearer %s"), *Token));
    ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
    [this](TSharedPtr<FApiRequest> Req, FHttpResponsePtr Response, bool bSuccess)
    {
        OnAuthComplete(Req, true);
    });
}

void FDeveloperAccountApi::TryRefreshAuthToken(TSharedPtr<FApiRequest> ApiRequest)
{
    ApiRequestToRetry = ApiRequest;
    FRefreshTokenRequest RefreshRequest;
    RefreshRequest.Data.Token = FDevAuthTokenCache::GetAuthData().Token;
    RefreshRequest.Data.RefreshToken = FDevAuthTokenCache::GetAuthData().RefreshToken;
    RefreshTokenAsync(RefreshRequest);
}

void FDeveloperAccountApi::OnRefreshTokenResponse(TSharedPtr<FApiRequest> Request, const FRefreshTokenResponse& Response, bool bWasSuccessful)
{
    if (bWasSuccessful && !Response.Data.Token.IsEmpty())
    {
        FDeveloperAuth Auth = FDevAuthTokenCache::GetAuthData();
        Auth.Token = Response.Data.Token;
        Auth.RefreshToken = Response.Data.RefreshToken;
        FDevAuthTokenCache::SetAuthData(Auth);

        if (PendingRequest.IsValid())
        {
            PendingRequest->Headers.Add(TEXT("Authorization"), FString::Printf(TEXT("Bearer %s"), *Response.Data.Token));
            DispatchRaw(PendingRequest);
            PendingRequest.Reset();
        }
    }
    else
    {
        UE_LOG(LogPlayerZero, Error, TEXT("Failed to refresh token"));
        if (PendingRequest.IsValid())
        {
            PendingRequest->OnApiRequestComplete.ExecuteIfBound(PendingRequest, FHttpResponsePtr(), false);
            PendingRequest.Reset();
        }
    }
}

void FDeveloperAccountApi::RefreshTokenAsync(const FRefreshTokenRequest& Request)
{
    AuthApi->RefreshToken(Request, FOnRefreshTokenResponse::CreateLambda( 
        [this](TSharedPtr<FApiRequest> ApiRequest, const FRefreshTokenResponse& Response, bool bWasSuccessful)
        {
            OnRefreshTokenResponse(ApiRequest, Response, bWasSuccessful);
        }));
}

void FDeveloperAccountApi::DispatchRawWithDevToken(TSharedPtr<FApiRequest> ApiRequest)
{
    const FString Token = FDevAuthTokenCache::GetAuthData().Token;
    if (Token.IsEmpty())
    {
        UE_LOG(LogPlayerZero, Error, TEXT("Developer token is empty. Aborting request to %s"), *ApiRequest->Url);
        ApiRequest->OnApiRequestComplete.ExecuteIfBound(ApiRequest, FHttpResponsePtr(), false);
        return;
    }

    ApiRequest->Headers.Add(TEXT("Authorization"), FString::Printf(TEXT("Bearer %s"), *Token));

    // Save request for retry in case of 401
    PendingRequest = ApiRequest;

    DispatchRaw(ApiRequest);
}

void FDeveloperAccountApi::OnAuthComplete(TSharedPtr<FApiRequest> ApiRequest, bool bWasSuccessful)
{
    if (bWasSuccessful && ApiRequest.IsValid())
    {
        DispatchRaw(ApiRequest);
    }
    else if (ApiRequest.IsValid())
    {
        ApiRequest->OnApiRequestComplete.ExecuteIfBound(ApiRequest, FHttpResponsePtr(), false);
    }
}

void FDeveloperAccountApi::OnAuthTokenRefreshed(TSharedPtr<FApiRequest> ApiRequest, const FRefreshTokenResponseBody& Response, bool bWasSuccessful)
{
    if (bWasSuccessful && ApiRequest.IsValid())
    {
        ApiRequest->Headers.Add(TEXT("Authorization"), FString::Printf(TEXT("Bearer %s"), *Response.Token));
        DispatchRaw(ApiRequest);
    }
    else if (ApiRequest.IsValid())
    {
        ApiRequest->OnApiRequestComplete.ExecuteIfBound(ApiRequest, FHttpResponsePtr(), false);
    }
}

void FDeveloperAccountApi::ListApplicationsAsync(const FApplicationListRequest& Request)
{
    const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
    ApiBaseUrl = PlayerZeroSettings->GetApiBaseUrl();
    const FString QueryString = BuildQueryString(Request.Params);
    const FString Url = FString::Printf(TEXT("%s/v1/applications%s"), *ApiBaseUrl, *QueryString);
    TSharedPtr<FApiRequest> ApiRequest = MakeShared<FApiRequest>();
    ApiRequest->Url = Url;
    ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
        [this](TSharedPtr<FApiRequest> Req, FHttpResponsePtr Response, bool bWasSuccessful)
        {
            HandleAppListResponse(Req, Response, bWasSuccessful);
        });
    DispatchRawWithDevToken(ApiRequest);
}

void FDeveloperAccountApi::ListOrganizationsAsync(const FOrganizationListRequest& Request)
{
    // TODO find better way to get settings (or move to editor only code)
    const UPlayerZeroDeveloperSettings* PlayerZeroSettings = GetDefault<UPlayerZeroDeveloperSettings>();
    ApiBaseUrl = PlayerZeroSettings->GetApiBaseUrl();
    const FString QueryString = BuildQueryString(Request.Params);
    const FString Url = FString::Printf(TEXT("%s/v1/organizations%s"), *ApiBaseUrl, *QueryString);
    TSharedPtr<FApiRequest> ApiRequest = MakeShared<FApiRequest>();
    ApiRequest->Url = Url;
    ApiRequest->OnApiRequestComplete = FOnApiRequestComplete::CreateLambda(
        [this](TSharedPtr<FApiRequest> Req, FHttpResponsePtr Response, bool bWasSuccessful)
        {
            HandleOrgListResponse(Req, Response, bWasSuccessful);
        });
    DispatchRawWithDevToken(ApiRequest);
}


void FDeveloperAccountApi::HandleAppListResponse(TSharedPtr<FApiRequest> ApiRequest, FHttpResponsePtr Response, bool bWasSuccessful)
{
    FApplicationListResponse ApplicationListResponse;
    FString Data = Response->GetContentAsString();
    if (bWasSuccessful && !Data.IsEmpty() && FJsonObjectConverter::JsonObjectStringToUStruct(Data, &ApplicationListResponse, 0, 0))
    {
        OnApplicationListResponse.ExecuteIfBound(ApplicationListResponse, true);
        return;
    }
    OnApplicationListResponse.ExecuteIfBound(ApplicationListResponse, false);
}

void FDeveloperAccountApi::HandleOrgListResponse(TSharedPtr<FApiRequest> ApiRequest, FHttpResponsePtr Response, bool bWasSuccessful)
{
    FOrganizationListResponse OrganizationListResponse;
    if(Response.IsValid())
    {
        UE_LOG(LogPlayerZero, Log, TEXT("Organization LIST request completed. Response code: %d"), Response->GetResponseCode());
        FString Data = Response->GetContentAsString();
        if (bWasSuccessful && !Data.IsEmpty() && FJsonObjectConverter::JsonObjectStringToUStruct(Data, &OrganizationListResponse, 0, 0))
        {
            OnOrganizationResponse.ExecuteIfBound(OrganizationListResponse, true);
            return;
        }
    }

    OnOrganizationResponse.ExecuteIfBound(OrganizationListResponse, false);
}


FString FDeveloperAccountApi::BuildQueryString(const TMap<FString, FString>& Params)
{
    if (Params.Num() == 0) return FString();
    FString QueryString = TEXT("?");
    for (const auto& Param : Params)
    {
        QueryString += Param.Key + TEXT("=") + Param.Value + TEXT("&");
    }
    QueryString.RemoveFromEnd(TEXT("&"));
    return QueryString;
}
