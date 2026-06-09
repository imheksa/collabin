import { useState, useEffect, useCallback, useRef } from 'react';
import { Fighter, GameFighterState, MatchResult, P2PInput } from '../types';
import { supabase } from '../lib/supabase';
import { calcDamage } from '../utils/statsCalculator';
import { applyUltimate } from '../utils/ultimates';