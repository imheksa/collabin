#pragma once

#include "CoreMinimal.h"
#include "Api/Common/WebApiWithAuth.h"

struct FRefreshTokenRequest;
class FAuthApi;
struct FOrganizationListResponse;
struct FOrganizationListRequest;
struct FApplicationListResponse;
struct FApplicationListRequest;

DECLARE_DELEGATE_TwoParams(FOnApplicationListResponse, const FApplicationListResponse&, bool);
DECLARE_DELEGATE_TwoParams(FOnOrganizationListResponse, const FOrganizationListResponse&, bool);

class PLAYERZEROEDITOR_API FDeveloperAccountApi : public FWebApi
{
public:
	FDeveloperAccountApi();

	TSharedPtr<FAuthApi> AuthApi;
	TSharedPtr<FApiRequest> PendingRequest;

	FOnApplicationListResponse OnApplicationListResponse;
	FOnOrganizationListResponse OnOrganizationResponse;

	void DispatchRawWithDevToken(TSharedPtr<FApiRequest> ApiRequest);
	void TryRefreshAuthToken(TSharedPtr<FApiRequest> ApiRequest);
	void RefreshTokenAsync(const FRefreshTokenRequest& Request);
	void OnRefreshTokenResponse(TSharedPtr<FApiRequest> Request, const FRefreshTokenResponse& Response, bool bWasSuccessful);
	void AddAuthToRequest(TSharedPtr<FApiRequest> ApiRequest);

	void OnAuthComplete(TSharedPtr<FApiRequest> ApiRequest, bool bWasSuccessful);
	void OnAuthTokenRefreshed(TSharedPtr<FApiRequest> ApiRequest, const FRefreshTokenResponseBody& Response, bool bWasSuccessful);

	void ListApplicationsAsync(const FApplicationListRequest& Request);
	void ListOrganizationsAsync(const FOrganizationListRequest& Request);

private:
	FString ApiBaseUrl;
	TSharedPtr<FApiRequest>ApiRequestToRetry;
	void HandleOrgListResponse(TSharedPtr<FApiRequest> ApiRequest, FHttpResponsePtr Response, bool bWasSuccessful);
	void HandleAppListResponse(TSharedPtr<FApiRequest>ApiRequest, FHttpResponsePtr Response, bool bWasSuccessful);
	
	static FString BuildQueryString(const TMap<FString, FString>& Params);
};
