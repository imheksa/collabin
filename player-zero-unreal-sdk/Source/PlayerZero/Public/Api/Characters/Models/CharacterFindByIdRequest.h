#pragma once

#include "CoreMinimal.h"
#include "CharacterFindByIdRequest.generated.h"

USTRUCT(BlueprintType)
struct FCharacterFindByIdRequest
{
	GENERATED_BODY()
	
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Player Zero")
	FString Id;
};
