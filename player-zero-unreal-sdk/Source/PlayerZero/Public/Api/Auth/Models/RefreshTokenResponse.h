#pragma once

#include "CoreMinimal.h"
#include "JsonObjectConverter.h"
#include "Api/Common/Models/ApiResponse.h"
#include "RefreshTokenResponse.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FRefreshTokenResponseBody : public FApiResponse
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|API")
	FString Token;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|API")
	FString RefreshToken;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonString(const FString& JsonString, FRefreshTokenResponseBody& OutStruct)
	{
		return FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &OutStruct, 0, 0);
	}
};

USTRUCT(BlueprintType)
struct PLAYERZERO_API FRefreshTokenResponse : public FApiResponse
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FRefreshTokenResponseBody Data;

	FString ToJsonString() const
	{
		FString OutputString;
		FJsonObjectConverter::UStructToJsonObjectString(*this, OutputString);
		return OutputString;
	}

	static bool FromJsonString(const FString& JsonString, FRefreshTokenResponse& OutStruct)
	{
		return FJsonObjectConverter::JsonObjectStringToUStruct(JsonString, &OutStruct, 0, 0);
	}
};


