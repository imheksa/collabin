import { Fighter, GameFighterState, MatchResult, P2PInput } from '../types';
import { supabase } from '../lib/supabase';
import { calcDamage } from '../utils/statsCalculator';
import { applyUltimate } from '../utils/ultimates';
import { getProfile, getCombatModifiers } from '../utils/playerProfile';
import { HPBar } from './HPBar';
import { playPunch, playKick, playSpecial, playUltimate, playBlock, playCombo, playKO, startBgMusic, stopBgMusic } from '../utils/sounds';
import { drawArchetypeFighter } from '../utils/fighterSprites';