#pragma once

#include "CoreMinimal.h"
#include "Models/RefreshTokenResponse.h"

struct FApiRequest;

DECLARE_DELEGATE_TwoParams(FOnAuthComplete, TSharedPtr<FApiRequest>, bool);
DECLARE_DELEGATE_ThreeParams(FOnTokenRefreshed, TSharedPtr<FApiRequest>, const FRefreshTokenResponseBody&, bool);

class PLAYERZERO_API IAuthenticationStrategy
{
public:
	FOnAuthComplete OnAuthComplete;
	FOnTokenRefreshed OnTokenRefreshed;

	virtual ~IAuthenticationStrategy() = default;
	virtual void AddAuthToRequest(TSharedPtr<FApiRequest> ApiRequest) = 0;
	virtual void TryRefresh(TSharedPtr<FApiRequest> ApiRequest) = 0;
	virtual void OnRefreshTokenResponse(TSharedPtr<FApiRequest> ApiRequest, const FRefreshTokenResponse& Response, bool bWasSuccessful) = 0;
};