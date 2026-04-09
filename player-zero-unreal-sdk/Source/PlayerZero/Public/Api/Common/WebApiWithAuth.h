#pragma once

#include "CoreMinimal.h"
#include "WebApi.h"
#include "Api/Auth/IAuthenticationStrategy.h"


class PLAYERZERO_API FWebApiWithAuth : public FWebApi
{
public:
	FWebApiWithAuth();
	FWebApiWithAuth(const TSharedPtr<IAuthenticationStrategy>& InAuthenticationStrategy);

	void SetAuthenticationStrategy(const TSharedPtr<IAuthenticationStrategy>& InAuthenticationStrategy);
	
	void OnAuthComplete(TSharedPtr<FApiRequest> ApiRequest, bool bWasSuccessful); 
	void OnAuthTokenRefreshed(TSharedPtr<FApiRequest> ApiRequest, const FRefreshTokenResponseBody& Response, bool bWasSuccessful); 

	void DispatchRawWithAuth(TSharedPtr<FApiRequest> ApiRequest);
	
protected:
	virtual void OnProcessResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bWasSuccessful, TSharedPtr<FApiRequest> ApiRequest) override;

private:
	TSharedPtr<IAuthenticationStrategy> AuthenticationStrategy;
};
