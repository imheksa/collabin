#pragma once

#include "CoreMinimal.h"
#include "Framework/Commands/Commands.h"
#include "UI/LoginWindowStyle.h"

class PLAYERZEROEDITOR_API FLoginWindowCommands: public TCommands<FLoginWindowCommands>
{
public:

	FLoginWindowCommands()
		: TCommands<FLoginWindowCommands>(TEXT("PlayerZeroEditor"), NSLOCTEXT("Contexts", "PlayerZeroEditor", "PlayerZero Plugin"), NAME_None, FLoginWindowStyle::GetStyleSetName())
	{
	}

	// TCommands<> interface
	virtual void RegisterCommands() override;

	TSharedPtr< FUICommandInfo > OpenPluginWindow;
};
