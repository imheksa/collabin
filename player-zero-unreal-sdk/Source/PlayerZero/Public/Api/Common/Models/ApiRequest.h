#pragma once

#include "CoreMinimal.h"
#include "UObject/ObjectMacros.h"
#include "HttpModule.h"
#include "ApiRequest.generated.h"



UENUM(BlueprintType)
enum ERequestMethod { 	
	GET,
	POST,
	PUT,
	DELETE,
	PATCH
};
struct FApiRequest;
DECLARE_DELEGATE_ThreeParams(FOnApiRequestComplete, TSharedPtr<FApiRequest>, FHttpResponsePtr, bool);

USTRUCT(BlueprintType)
struct PLAYERZERO_API FApiRequest
{
	GENERATED_BODY()
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString Url;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	TEnumAsByte<ERequestMethod> Method = GET;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	TMap<FString, FString> Headers;

	TMap<FString, FString> QueryParams;

	FString Payload;

	FOnApiRequestComplete OnApiRequestComplete;

	FString GetVerb() const
	{
		switch (Method)
		{
		case GET: default:
			return TEXT("GET");
		case POST:
			return TEXT("POST");
		case PUT:
			return TEXT("PUT");
		case PATCH:
			return TEXT("PATCH");
		case DELETE:
			return TEXT("DELETE");
		}
	}

	bool IsValid() const
	{
		return !Url.IsEmpty();
	}
};



USTRUCT(BlueprintType)
struct PLAYERZERO_API FApiRequestBody
{
	GENERATED_BODY()
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero", meta = (JsonName = "data"))
	FString Data;
};