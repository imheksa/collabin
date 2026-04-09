#pragma once

#include "CoreMinimal.h"

struct FAvatarRenderConfig;
struct FAvatarConfig;

class FPlayerZeroConfigProcessor
{
public:
	static FString ProcessCharacter(const FAvatarConfig& Config);
	static FString ProcessRender(const FAvatarRenderConfig& Config);
};
