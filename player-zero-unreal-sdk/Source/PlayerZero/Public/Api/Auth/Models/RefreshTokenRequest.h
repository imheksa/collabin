#pragma once

#include "CoreMinimal.h"
#include "JsonObjectConverter.h"
#include "RefreshTokenRequest.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FRefreshTokenRequestBody
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString Token;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString RefreshToken;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonString(const FString& JsonString, FRefreshTokenRequestBody& OutStruct)
	{
		return FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &OutStruct, 0, 0);
	}
};

USTRUCT(BlueprintType)
struct PLAYERZERO_API FRefreshTokenRequest
{
	GENERATED_BODY()


	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FRefreshTokenRequestBody Data;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonString(const FString& JsonString, FRefreshTokenRequest& OutStruct)
	{
		return FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &OutStruct, 0, 0);
	}
};
