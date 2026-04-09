#include "UI/Commands/LoginWindowCommands.h"

#define LOCTEXT_NAMESPACE "FPlayerZeroEditorModule"

void FLoginWindowCommands::RegisterCommands()
{
	UI_COMMAND(OpenPluginWindow, "PlayerZero Developer window", "Bring up RPM Developer window", EUserInterfaceActionType::Button, FInputChord());
}

#undef LOCTEXT_NAMESPACE
