#pragma once

#include "CoreMinimal.h"
#include "Api/Common/WebApi.h"

struct FAvatarCodeResponse;

DECLARE_DELEGATE_TwoParams(FOnAvatarCodeResponse, const FAvatarCodeResponse&, bool);


class PLAYERZERO_API FAvatarCodeApi :  public FWebApi
{
public:
	FAvatarCodeApi();
	void GetAvatarCode(const FString& AvatarId, FOnAvatarCodeResponse OnComplete);

private:
	FString ApiUrl;
};
