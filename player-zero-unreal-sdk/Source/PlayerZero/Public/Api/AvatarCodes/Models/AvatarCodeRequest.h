#pragma once

#include "CoreMinimal.h"
#include "AvatarCodeRequest.generated.h"

USTRUCT(BlueprintType)
struct PLAYERZERO_API FAvatarCodeRequest
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero|Avatar Codes")
	FString Code;
};
