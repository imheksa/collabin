#pragma once

#include "CoreMinimal.h"
#include "Api/Common/WebApi.h"

struct FRefreshTokenResponse;
struct FRefreshTokenRequest;

DECLARE_DELEGATE_ThreeParams(FOnRefreshTokenResponse, TSharedPtr<FApiRequest>, const FRefreshTokenResponse&, bool);

class PLAYERZERO_API FAuthApi : public FWebApi
{
public:
	
	FAuthApi();
	void RefreshToken(const FRefreshTokenRequest& Request, FOnRefreshTokenResponse OnComplete);

private:
	FString ApiUrl;
};
