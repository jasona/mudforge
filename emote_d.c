//:TS
// 1998-Oct-04 : Halo     : Added support to use remote string.
// 1999-Mar-10 : Hayden   : Hungarianized, doc'd and soul history added.
// 1999-Apr-26 : Rodney   : If a remote player is LD, don't emote to them.
// 1999-May-25 : Rodney   : Changed history implementation.
// 1999-Jul-29 : Malraux  : Added emote tracking daemon support
// 1999-Aug-25 : Hayden   : Added "parseRule" code used by semote and
//                        : addemote commands.
// 1999-Aug-31 : Malraux  : Added iNoRemoveEvent for silent removes.

#include <mudlib.h>
//#include <security.h>
//#include <daemons.h>

#include <perms.h>

// Definitions.
#define WOLF_FORM 2
#define TP      this_player()
#define CAP(x)     capitalize(x)
#define CAP_NAME   TP->query_cap_name()
#define REAL_NAME  TP->query_real_name()
#define MYLEVEL    TP->query_level()
#define GHOST(x)   x->query_ghost()
#define DB_TABLE   "tbl_emote"
#define SPECIAL_EMOTES "/cmds/soul/"

inherit M_MESSAGES;
inherit M_COMPLETE;
//inherit M_ACCESS;
inherit M_GRAMMAR;

private mapping emotes;
private string* adverbs;

private string get_completion(string s);

#define SAVE_FILE           "/secure/savedir/soul"
#define CMD_ADD_EMOTE       "cmds/architect/_addemote"
#define CMD_REMOVE_EMOTE    "cmds/architect/_rmemote"
#define CMD_MOVE_EMOTE      "cmds/builder/mvemote"
//#define IMUD_CHANNELT_DUMMY "/obj/mudlib/ichannelt"


void reset(int arg) {
    string sVerb, *keys;
    mapping mValue;
    int i;

    if (arg)
        return;

    restore_object(SAVE_FILE);

    /*
    keys = m_indices(emotes);
    i = sizeof(keys);
    while (i--)
      {
        sVerb = keys[i];
        mValue = emotes[sVerb];

        if (mValue[0]) {
          mValue[""] = mValue[0];
          mValue = m_delete(mValue, 0);
        }
        if (mValue[1]) {
          mValue["STR"] = mValue[1];
          mValue = m_delete(mValue, 1);
        }

      }
    */

    if (!adverbs)
        adverbs = ({});
}


/////////////////////////
// Modularized checks. //
//////////////////////////////////////////////////////////////////////

int ignore_check(object oObject) {
    if (oObject->check_ignore(REAL_NAME)
      && (TP->query_level() < IMPLEMENTOR)) {
        return 1;
    }
    return 0;
}

int invis_check(object oObject) {
    if (oObject->query_invis() > TP->query_level()) {
        return 1;
    }
    return 0;
}


//:FUNCTION stat_me()
// Return statistics of the Soul Daemon
string stat_me()
{
    return "Number of feelings: " + sizeof(emotes) + "\n";
}


//:FUNCTION add_emote(string, mixed, string)
// Add an emote
int add_emote(string sVerb, mixed xRule, mixed asParts)
{
    //if (to_string(previous_object()) != CMD_ADD_EMOTE)
    //  raise_error("Illegal call to add_emote()\n");

    if (!emotes[sVerb])
    {
        emotes[sVerb] = ([]);

        // 1999-07-28 Malraux
        //      EMOTETRACK_D->add_emote(sVerb);
    }
    else
    {
        // 1999-07-28 Malraux
        //      EMOTETRACK_D->change_emote(sVerb);
    }

    if(pointerp(asParts)) {
        if (sizeof(asParts) > 1)
            emotes[sVerb][xRule] = asParts;
        else
            emotes[sVerb][xRule] = asParts[0];
    } else emotes[sVerb][xRule] = asParts;

    save_object(SAVE_FILE);

    return 1;
}


//:FUNCTION test_rule(string, string)
// Test if the given rule is valid
int test_rule(string sVerb, string sRule) {
    //    parse_add_rule(sVerb, sRule);
    return 1;
}


//:FUNCTION remove_emote(string, string, int)
// Remove an emote or just the specific rule, with or without changeevent
varargs int remove_emote(string sVerb, string sRule, int iNoRemoveEvent)
{
    if (to_string(previous_object()) != CMD_REMOVE_EMOTE &&
      to_string(previous_object()) != CMD_ADD_EMOTE)
        raise_error("Illegal call to remove_emote()\n");

    if (!emotes[sVerb]) return 0;

    if (sRule == "empty")
        sRule = "";

    if (sRule || sRule == "") {
        if (!emotes[sVerb][sRule])
            return 0;

        emotes[sVerb] = m_delete(emotes[sVerb], sRule);
    } else {
        emotes = m_delete(emotes, sVerb);

        // 1999-07-28 Malraux
        //  if (!iNoRemoveEvent)
        //    EMOTETRACK_D->remove_emote(sVerb);
    }

    save_object(SAVE_FILE);

    return 1;
}


//:FUNCTION move_emote(string, string)
// Move an Emote
int move_emote(string sVerb, string sDest)
{
    if (to_string(previous_object()) != CMD_MOVE_EMOTE)
        raise_error("Illegal call to move_emote()\n");

    if ((!emotes[sVerb]) || (!sDest)) return 0;

    emotes[sDest] = emotes[sVerb];

    emotes = m_delete(emotes, sVerb);
    save_object(SAVE_FILE);

    // 1999-07-28 Malraux
    //    EMOTETRACK_D->move_emote(sVerb);
    //    EMOTETRACK_D->move_emote(sDest);

    return 1;
}


//:FUNCTION query_emote
// Return the given emote
mixed query_emote(string sEmote) {
    return emotes[sEmote];
}


//:FUNCTION internal_get_soul(string, string, mixed, int)
// Get the response for the soul
string add_linefeed(string val, object * aoWho)
{
    if(closurep(val)) val = apply(val, aoWho);
    if (val[<1] == '\n')
        return val;
    return val + "\n";
}

mixed * internal_get_soul(string sVerb, string sRule, mixed *axArgs,
  int iAddImudMsg)
{
    mapping mRules;
    mixed xSoul;
    int iIdx, iJ, iNum;
    object *aoWho, *aoIMudWho;
    string sToken, *toks;
    mixed *axResult;

    int i, len;

    mRules = emotes[sVerb];

    if (!mRules) return 0;

    xSoul = mRules[sRule];

    if (!xSoul) return 0;

    // minus the verb's real name; we don't want to process the real names
    // of any of the objects
    iNum = (sizeof(axArgs) - 1)/2;

    for (iIdx = 0; iIdx < iNum; iIdx++)
    {
        if (stringp(axArgs[iIdx]) && strlen(axArgs[iIdx]) &&
          axArgs[iIdx][<1] == '*' &&
          member_array(' ', axArgs[iIdx]) == -1)
        {
            axArgs[iIdx] = get_completion(axArgs[iIdx][0..<2]);
            if (!axArgs[iIdx])
                return 0;
            break;
        }
    }

    aoWho = ({ this_player() });

    //    if (iAddImudMsg)
    //        aoIMudWho = ({ new( IMUD_CHANNELT_DUMMY, this_player(), 3 ) });

    if (strstr(sRule, "LIV") != -1)
    {
        iIdx = 0;

        len = sizeof(toks = explode(sRule, " "));
        for (i=0; i < len; i++)
        {
            sToken = toks[i];
            if (sToken == "LIV") {
                aoWho += ({ axArgs[iIdx] });

                //                if (iAddImudMsg)
                //                    aoIMudWho += ({ new(IMUD_CHANNELT_DUMMY, axArgs[iIdx],
                //                                        2) });

                axArgs[iIdx..iIdx] = ({ });
            } else
            if (sToken[0] >= 'A' && sToken[0] <= 'Z')
                iIdx++;
        }
    }


    if (xSoul[0] == '=') xSoul = mRules[xSoul[1..]];
    // 12-07-03 Aiken: Removed to attempt to get guild emotes into here
    //  if (xSoul[0..1] == "->") xSoul = call_other(SPECIAL_EMOTES + xSoul[2..], "get_emote", sRule, aoWho);
    if (xSoul[0..1] == "->") {
        if (xSoul[2..7] == "Guild_") {		// Guild emote
            string *asGuilds;
            int iPos;

            if (!(asGuilds = this_player()->query_guild()))
                return 0;
            string sGuild = xSoul[8..(iPos = strstr(xSoul, "_", 8)) - 1];
            if (member(asGuilds, sGuild) == -1)
                return 0;
            else
                xSoul = call_other(SPECIAL_EMOTES + lower_case(sGuild) + "/" + xSoul[iPos + 1..],
                  "get_emote", sRule, aoWho);
        } else
            xSoul = call_other(SPECIAL_EMOTES + xSoul[2..],
              "get_emote", sRule, aoWho);
    }
    if (stringp(xSoul)) {
        if (xSoul[<1] != '\n') xSoul += "\n";
    } else {
        //        xSoul = map(xSoul, (: $1[<1] == '\n' ? $1 : $1 + "\n" :));
        /*
        printf("xSoul: %O\n", xSoul);
          xSoul = map(xSoul, lambda( ({ quote("x") }),
                                           ({ symbol_function("?"),
                                                ({ symbol_function("=="),
                                                     ({ symbol_function("[<"), quote("x"), 1 }),
                                                     quote("\n") }),
                                                quote("x"),
                                                ({ symbol_function("+"), quote("x"), "\n" })
                                           })
                           ));
        */
        xSoul = map(xSoul, "add_linefeed", this_object(), aoWho);
    }


    if (iAddImudMsg)
        axResult = ({ aoWho, allocate( sizeof(aoWho) + 1),
          allocate(sizeof(aoIMudWho) + 1) });
    else
        axResult = ({ aoWho, allocate(sizeof(aoWho) + 1) });

    for (iJ = 0; iJ < iAddImudMsg + 1; iJ++)
    {
        object *aoW;

        aoW = (iJ ? aoIMudWho : aoWho);

        for (iIdx = 0; iIdx < sizeof(aoW); iIdx++) {
            string sTmp;

            if (stringp(xSoul))
                sTmp = xSoul;
            else {
                if (iIdx && iIdx + 1 < sizeof(xSoul))
                    sTmp = xSoul[iIdx + 1];
                else
                    sTmp = xSoul[0];
            }

            axResult[1+iJ][iIdx] = apply(symbol_function("call_other"), this_object(), "compose_message",
              ({aoW[iIdx], sTmp, aoW}) + axArgs);
            //            axResult[1 + iJ][iIdx] = compose_message(aoW[iIdx], sTmp, aoW,
            //                                                     varargs axArgs);
        }
        //### tmp fix
        axResult[1+iJ][<1] = apply(symbol_function("call_other"), this_object(), "compose_message",
          ({0, stringp(xSoul) ? xSoul : xSoul[1], aoW}) + axArgs);
        //        axResult[1 + iJ][<1] =
        //          compose_message(0, stringp(xSoul) ? xSoul : xSoul[1], aoW,
        //                          varargs axArgs);
    }

    return axResult;
}


//:FUNCTION get_soul(string, string, mixed)
// Get the soul definition
varargs mixed *get_soul(string sVerb, string sRule, varargs mixed *axArgs)
{
    return internal_get_soul(sVerb, sRule, axArgs, 0);
}

//:FUNCTION get_imud_soul(string, string, mixed)
// Get an imud soul definition
varargs mixed *get_imud_soul(string sVerb, string sRule, varargs mixed axArgs)
{
    return internal_get_soul(sVerb, sRule, axArgs, 1);
}


//:FUNCTION list_emotes()
// Get a list of emotes
mixed list_emotes()
{
    return m_indices(emotes);
}


//:FUNCTION emote_apropos(string)
// Search the emotes for a given string
string *emote_apropos(string sStr) {
    int     iNumVerbs, iNumRules;
    int     iIdx, iJ;
    string *asVerbs, *asRules, *asFound;
    mapping mRulesForVerb;
    mixed   xData;

    asFound   = ({ });
    asVerbs   = m_indices(emotes);
    iNumVerbs = sizeof(asVerbs);

    for (iIdx = 0; iIdx < iNumVerbs; iIdx++) {
        mRulesForVerb = emotes[asVerbs[iIdx]];
        asRules       = m_indices(mRulesForVerb);
        iNumRules     = sizeof(asRules);

        for (iJ = 0; iJ < iNumRules; iJ++) {
            xData = mRulesForVerb[asRules[iJ]];

            if (pointerp(xData)) {
                if (strstr(lower_case(xData[0]), lower_case(sStr)) != -1 ||
                  strstr(lower_case(xData[1]), lower_case(sStr)) != -1)
                    asFound += ({ asVerbs[iIdx] + " " + asRules[iJ] });
            }
            else {
                if (strstr(lower_case(xData), lower_case(sStr)) != -1)
                    asFound += ({ asVerbs[iIdx] + " " + asRules[iJ] });
            }
        }
    }

    return asFound;
}


private string get_completion(string sStr)
{
    string *asCompletions;

    asCompletions = complete(sStr, adverbs);

    switch (sizeof(asCompletions))
    {
    case 0:
        write("Can't find a match for '" + sStr + "*'.\n");
        return 0;
    case 1:
        return asCompletions[0];
    default:
        write("Can't find a unique match.\nFound: " +
          implode(asCompletions,", ") + "\n");
        return 0;
    }
}


/*
** Interface with parsing functions.  We use the "wild" card functions
** so that we don't have to support a gazillion can/do type actions.
*/

int livings_are_remote() { return 1; }

mixed can_verb_wrd(string sVerb, string sWrd)
{
    return member_array(sWrd, adverbs) != -1 || member_array('*', sWrd) != -1;
}


mixed can_verb_rule(string sVerb, string sRule)
{
    if (!emotes[sVerb]) return 0;
    return emotes[sVerb][sRule];
}


mixed direct_verb_rule(string sVerb, string sRule)
{
    return !emotes[sVerb][sRule];
}


mixed indirect_verb_rule(string sVerb, string sRule)
{
    return !emotes[sVerb][sRule];
}


varargs string munge_speech(string sText, object oPlayer)
{
    object ob;

    if (!oPlayer) oPlayer = this_player();

    if (ob = present("high_ob", oPlayer))
        sText = ob->garble(sText);

    if (oPlayer->query_viking())
        sText = VIKING_D->vikingize(sText);
    if(oPlayer->query_crinos())
        sText = oPlayer->convolute_say(sText);

    return sText;
}

void do_verb_rule(string sVerb, string sRule, varargs mixed axArgs)
{
    mixed   xSoul;
    string  sMyRStr, sHisRStr, sHisName;
    object *aoUsers, who;
    int i, len, remoted, iTime;
    string msg, name, remotestr, remname;
    string *remstrs;

    xSoul = apply(symbol_function("call_other"), this_object(), "get_soul",
      ({sVerb, sRule}) + axArgs);
    if (!xSoul) {
        write("What ?\n");
        return;
    }

    len = sizeof(xSoul[0]);

    remoted = 0;

    name = capitalize(this_player()->query_real_name());

    // xSoul[0][0] is this_player()
    for (i = 1; i < len; i++)
    {
        who = xSoul[0][1];

        if (ignore_check(who)) {
            write("Sorry, that player is ignoring you.\n");
            return;
        }

        if(!who->query_npc())
            if(!IS_IMPLEMENTOR(this_player()) && (who->query_channels()["remote"]
                != 1)) {
                write("Sorry, that player has their remote soul off.\n");
                return;
            }

        if(!interactive(who) && !who->query_npc())
        {
            printf("%s is linkdead, and cannot be emoted to.\n", who->query_cap_name());
            return;
        }

        if (!who->query_npc())
        {
            if (interactive(who))
            {
                if (query_idle(who) > 120)
                {
                    printf("%s has been idle for: ", CAP(who->query_real_name()));
                    iTime = query_idle(who);
                    write(iTime/3600+" hours, ");
                    iTime = iTime - (iTime/3600)*3600;
                    write(iTime/60+" minutes, and ");
                    iTime = iTime - (iTime/60)*60;
                    write(iTime+" seconds.\n");
                }
            }
        }

        if (immediately_accessible(who))
            continue;

        remoted = 1;

        msg = xSoul[1][i];

        remname = (this_player()->query_invis() <= who->query_level() && strstr(msg, name) < 0 ? name : 0);

        if (remname)
        {
            remotestr = who->query_remote_str_named();
            remotestr = implode(explode(remotestr, "$N"), name);
        }
        else
        {
            remotestr = who->query_remote_str_anon();
        }

        xSoul[1][i] = who->query_channel_color("remote") + remotestr + " " + msg;
    }


    if (remoted)
    {
        xSoul[1][0] = this_player()->query_channel_color("remote")
        + this_player()->query_remote_str_anon() + " " + xSoul[1][0];

        inform(xSoul[0], xSoul[1], 0, "emote");
    }
    else
    {
        inform(xSoul[0], xSoul[1], environment(this_player()), "emote");
    }

    return;
}

object find_target_object(string str)
{
    object obj;

    if (!str) return 0;

    if (environment(this_player()))
    {
        if (!(obj = present(str, environment(this_player()))) &&
          !(obj = present(lower_case(str), environment(this_player()))))
        {
            obj = find_player(str);
            if (!obj) obj = find_player(lower_case(str));
        }
    }

    if (obj && living(obj))
    {
        if(!interactive(obj) && !obj->query_npc())
            return 0;

        if (obj->query_invis() > this_player()->query_level())
            return 0;
    }
    else
    {
        if(!(obj = present(str, this_player())))
            return 0;
    }

    return obj;
}

mixed * parse_emote(string verb, string arg) {
    string sTempArg;
    string *args;
    string who1, who2, str1, str2, rule1, rule2;
    mixed obj1, obj2;
    string sToken, sRest;
    mixed* axEmote;
    int i;

    if (arg == "")
        arg = " ";

    /* changed to allow quotes to specify longer targets - bob 20/06/2003
    args = explode(arg, " ");
    */
    args = ({});
    sTempArg = arg;
    while (sizeof(sTempArg) > 0) {
        if (sTempArg[0..0] == " ") {
            // remove leading space
            sTempArg = sTempArg[1..];
        } else if (sscanf(sTempArg, "\"%s\"%s", sToken, sRest) == 2) {
            // extract quoted token
            args += ({ sToken });
            sTempArg = sRest;
        } else if (sscanf(sTempArg, "%s %s", sToken, sRest) == 2) {    
            // extract spaced token
            args += ({ sToken });
            sTempArg = sRest; 
        } else {
            // no spaces or paired quotes
            args += ({ sTempArg });      
            sTempArg = "";
        }    
    }

    axEmote = ({ "" });
    sTempArg = 0;
    for (i = 0; i < sizeof(args); i++) {
        sToken = args[i];
        obj1 = find_target_object(this_player()->check_alias(sToken));
        if (!obj1) obj1 = find_target_object(sToken);
        if (!obj1 || sTempArg) {
            rule1 = "STR";
            if (!sTempArg) {
                sTempArg = sToken;
            } else {
                sTempArg = sprintf("%s %s", sTempArg, sToken);
            }
            if (i < (sizeof(args)-1)) continue;
            obj1 = munge_speech(sTempArg);
        } else {
            rule1 = (living(obj1)) ? "LIV" : "OBJ";
        }
        if (axEmote[0] == "") {
            axEmote[0] = rule1;
        } else {
            axEmote[0] = sprintf("%s %s", axEmote[0], rule1);
        }
        axEmote += ({ obj1 });
    }
    if (!can_verb_rule(verb, axEmote[0])) return 0;
    return ({ verb }) + axEmote;
}


string build_msg(string sHeader, string sMsg, string sChan, mixed *xMessages) {
    int ll, i;

    return sHeader + " " + sMsg;
    /*
      if (((i = strstr(msg, "\n")) >= 0) && (i != (strlen(msg) - 1))) {
        return header + " " + msg;
      }

      header += " ";

      ll = strlen(header);

      msg = break_string(msg, 75, ll);

      return header + msg[ll..];
    */
}

varargs int channel_soul(string header, string msg, string ch, int minlevel,
  string spec) {
    string args, verb, *parsed;
    object cur;
    mixed *messages;
    int ll, i;
    string * emoteKeys;
    status tRandom;

    if (msg == "")
        return 0;

    if (!ch || ch == "")
        ch = "shout";

    if (!minlevel)
        minlevel = 1;

    if (sscanf(msg, "%s %s", verb, args) != 2)
    {
        verb = msg;
        args = "";
    }

    //If viking'd don't allow them to circumvent by emoting.
    if (TP->query_viking()) {
        verb = "bork";
        args = "";
    }
    // 07-01-03 Aiken: Hack hack hack hack. Use garou real_names on channel emotes
    if (TP)
        TP->set_attribute("channel_emote", 1);

    set_use_chan_tokens(1);
    if (verb == "random")
    {
        tRandom = 1;
        emoteKeys = list_emotes();

        while (1)
        {
            verb = emoteKeys[random(sizeof(emoteKeys))];
            if ((messages = apply(symbol_function("call_other"),
                  this_object(),
                  "get_soul",
                  parse_emote(verb, args)
                )
              )
              && sizeof(messages))
                break;
        }
    } else {
        if (!(messages = apply(symbol_function("call_other"), this_object(),
              "get_soul", parse_emote(verb, args))) || !sizeof(messages)) {
            if (TP)
                TP->remove_attribute("channel_emote");
            set_use_chan_tokens(0);
            return 0;
        }
    }

    set_use_chan_tokens(0);

    mixed xInfo = ({});
    if (sizeof(messages[0])) {
        foreach (object oPeople : messages[0])
        xInfo += ({ ({ oPeople->query_invis(), IS_APPLICANT(oPeople),
            oPeople->query_cap_name(), oPeople->query_real_name() }) });
    }


    i = sizeof(messages[0]);
    while (i--) {
        string tmp;

        cur = messages[0][i];
        if (cur->query_level() >= minlevel && (cur != this_player() || i == 0))
            cur->catch_channel(compose_channel_msg(ch, header + " " + messages[1][i],
                xInfo, 0, cur), ch, messages[0][0]);
    }

    channel_msg(header + " " + messages[1][sizeof(messages[1]) - 1], ch, minlevel,
      0, xInfo, messages[0]);

    if (tRandom)
        tell_object(this_player(), "That was the \"" + verb + "\" emote.\n");

    if (TP)
        TP->remove_attribute("channel_emote");

    return 1;
}


int try_emote(string sVerb, string sArg) {
    object oGuildObj;
    string *asArgs;
    mixed *axStuff;


    if (oGuildObj = present("garou soul", TP)) {
        if (oGuildObj->query_current_form() == WOLF_FORM) {
            return 0;
        }
    }

    if (sscanf(sArg, "mywho%s", sArg) == 1) {
        if (sArg != "" && sArg[0] != ' ')
            return 0;
        asArgs = filter(TP->query_mywho(), (: return find_target_object($1); :));
        if (!sizeof(asArgs))
            return notify_fail("No one on your mywho list is currently logged in.\n");
        foreach(string sWho : asArgs) {
            if (axStuff = parse_emote(sVerb, sWho + sArg)) {
                if (TP->query_ghost())
                    return notify_fail("You cannot do that in your immaterial state.\n");
                if (TP->query_invis() && !IS_APPLICANT(TP)) {
                    write("You can't do that and remain invisible.\n");
                    TP->set_invis(0);
                }
                apply(symbol_function("call_other"), this_object(),
                  "do_verb_rule", axStuff);
            }
        }
        return 1;
    }

    if (axStuff = parse_emote(sVerb, sArg)) {
        if (TP->query_ghost())
            return notify_fail("You cannot do that in your immaterial state.\n");
        if (TP->query_invis() && !IS_APPLICANT(TP)) {
            write("You can't do that and remain invisible.\n");
            TP->set_invis(0);
        }
        apply(symbol_function("call_other"), this_object(),
          "do_verb_rule", axStuff);
        return 1;
    }

    return 0;
}

mixed parse_my_rules(object o, string s, object nul)
{
    return 0;
}

mixed *parse_soul(string sStr) {
    mixed xResult;
    mixed xSoul;

    xResult = parse_my_rules(this_player(), sStr, 0);

    if (!xResult) return 0;

    if (intp(xResult) || stringp(xResult)) return 0;

    xSoul = get_soul(xResult[0], xResult[1], xResult[2..]);

    if (!xSoul) return 0;

    return xSoul;
}

/*
mixed *parse_imud_soul(string sArg) {
    object oTemp;
    mixed xResult;
    mixed xSoul;
    int iIdx;

    // This bit of the code can only handle one person,
    // could make it handle more, but its not worth it while the IMUD stuff
    // only handles two people
    iIdx = strstr(sArg, "@");

    if (iIdx > -1)
    {
        string sStr = sArg[strstr(sArg[0..iIdx], " ", -1 ) + 1..
                           strstr(sArg[iIdx..]+" ", " " ) -1 + iIdx];

        oTemp = new(IMUD_CHANNELT_DUMMY, sStr);

        if (oTemp)
            sArg = replace_string(sArg, sStr, "wibblewibble" + sStr);
    }

    xResult = parse_my_rules(this_player(), sArg, 0 );

    if (!xResult || intp(xResult) || stringp(xResult))
    {
        if (oTemp ) oTemp->remove();

        return 0;
    }

    xSoul = get_imud_soul(varargs xResult);

    if (!xSoul)
        return 0;

    return xSoul;
}
*/

void set_adverbs(string *asMods)
{
    if(!pointerp(asMods)) raise_error("bad arg type");

    adverbs = asMods;

    save_object(SAVE_FILE);
}


string * get_adverbs()
{
    return adverbs;
}


void add_adverb(string sAdverb)
{
    if (!stringp(sAdverb)) raise_error("bad arg type");

    adverbs += ({ sAdverb });

    save_object(SAVE_FILE);
}


void remove_adverb(string sAdverb)
{
    adverbs -= ({ sAdverb });

    save_object(SAVE_FILE);
}


string parseRule(string sKey, string sWhich, object oObj)
{
    string  *asRules, sSyntax, sTemp, sOutput;
    mixed   *axInfo, *axFormat;
    int      j;

    if (sKey == "")
    {
        asRules = ({});
    }
    else
    {
        asRules  = explode(sKey, " ");
    }

    axFormat = ({ });
    sSyntax  = "";

    // Figure out the syntax for the emote
    // Figure out The call to SOUL_D->get_soul (the 3rd arg/array)
    for (j = 0; j < sizeof(asRules); j++)
    {
        if (asRules[j] == "LIV")
        {
            sSyntax += " somebody";
            axFormat += ({ oObj });
        }
        else if (asRules[j] == "STR")
        {
            sSyntax += " ______";
            axFormat += ({ "______" });
        }
        else
        {
            sSyntax += " WRD";
            axFormat += ({ "WRD" });
        }
    }

    axInfo = apply(symbol_function("call_other"), this_object(), "get_soul",
      ({sWhich, sKey}) + axFormat);

    if (!axInfo)
        return 0;

    sOutput = sprintf("%s%s :\n", sWhich, sSyntax);
    sOutput += sprintf("     You'll see: \n%s\n", local_wrap(axInfo[1][0]));

    if (strstr(sKey, "LIV", 0) > -1)
    {
        sOutput += sprintf("Target will see: \n%s\n", local_wrap(axInfo[1][1]));
        sOutput += sprintf("Others will see: \n%s\n\n", local_wrap(axInfo[1][2]));
    } else {
        sOutput += sprintf("Others will see: \n%s\n\n", local_wrap(axInfo[1][1]));
    }

    return sOutput;
}



// ********** OLD SOUL DAEMON CODE

// Soul daemon - sould.c
//  Description:
//     Handles feelings that are general, specific, remote or local. Also
//     handles any response to feelings.
//
// 02/02/95 : Grayhawk   : Adding ignore support.
// 11/07/95 : Antcrusher : Added possessive and objective for remote player.
// 07/12/98 : Acer       : Hungarianized.
//                       : Cleaned up, generally.
//                       : Cleaned up model, keeping old model for old emote
//                         support until we can migrate old emotes to new
//                         system.
//                       : Added response support.
//                       : Added LD/idle/NPC identification.
//                       : Added real name for emoters whose cap_name
//                       :  was funky for some reason.
// 08/14/98 : Acer       : Added channel history support.
//
// 08/28/98 : Xnedra     : Added a query for absolute possessive pronouns
//
// 12/01/01 : Souldancer : Can no longer emote to nonpresent NPCs.
//

/////////////////////
// Start Old Code. //
//////////////////////////////////////////////////////////////////////

// Emote when used without an argument.
int general(string sWhatISee, string sWhatOthersSee) {

    if (TP->query_ghost()) {
        notify_fail("You cannot do that in your immmaterial state.\n");
        return 1;
    }

    write(wrap(sWhatISee));
    say(wrap(sprintf("%s %s", CAP_NAME, sWhatOthersSee)));
    TP->add_channel_history("emote", wrap(sWhatISee));
    return 1;
}

// Emote when targeting a specific player.
int specific(string sWhatISee, string sWhatOthersSee, string sTargetName,
  string sWhatTargetSees) {
    int iTime;
    object oTarget;

    if (TP->query_ghost()) {
        tell_object(TP, "You cannot do that in your immmaterial state.\n");
        return 1;
    }

    if (TP->check_alias(sTargetName))
        sTargetName = TP->check_alias(sTargetName);

    oTarget = present(sTargetName,environment(TP));
    if(!oTarget) {
        if (!oTarget = find_living(sTargetName)) {
            tell_object(TP, "Player is not logged on, or does not exist.\n");
            return 1;
        }
    }

    if (oTarget->query_invis() > TP->query_level()) {
        tell_object(TP, "Player is not logged on, or does not exist.\n");
        return 1;
    }

    if (oTarget == TP) {
        tell_object(TP, "Why would you want to emote yourself?\n");
        return 1;
    }

    if (ignore_check(oTarget)) {
        tell_object(TP, "Sorry, that player is ignoring you.\n");
        return 1;
    }

    if (invis_check(oTarget)) {
        return 1;
    }

    // If target is linkdead/npc/idle, say so.
    if (!query_ip_number(oTarget)) {
        if (oTarget->query_npc()) {
            if(!present(oTarget, environment(TP))) {
                tell_object(TP, "That NPC doesn't appear to be here.\n");
                return 1;
            } else {
                write("You just emoted an NPC by the way.\n");
            }
        } else {
            write("That person is linkdead.\n");
        }
    }
    if (!oTarget->query_npc()) {
        if (interactive(oTarget)) {
            if (query_idle(oTarget) > 120) {
                printf("%s has been idle for: ", CAP(oTarget->query_real_name()));
                iTime = query_idle(oTarget);
                write(iTime/3600+" hours, ");
                iTime = iTime - (iTime/3600)*3600;
                write(iTime/60+" minutes, and ");
                iTime = iTime - (iTime/60)*60;
                write(iTime+" seconds.\n");
            }
        }
    }

    // If they're in the same room, and invis.
    if (present(sTargetName, environment(TP))
      && !oTarget->query_invis() ) {
        write(wrap(sWhatISee));
        if (IS_APPLICANT(oTarget) && (lower_case(CAP_NAME) != REAL_NAME)) {
            sWhatTargetSees += " (" + CAP(REAL_NAME) + ")";
        }
        tell_object(oTarget,
          wrap(sprintf("%s %s", CAP_NAME, sWhatTargetSees)));
        say(wrap(sprintf("%s %s", CAP_NAME, sWhatOthersSee)), oTarget);
        TP->add_channel_history("emote", wrap(sWhatISee));
        oTarget->add_channel_history("emote", wrap(CAP_NAME+" "+sWhatTargetSees));
        return 1;
    }

    // If cap name is changed (invis, etc..) and target is a wiz - include
    // real name.
    if (IS_APPLICANT(oTarget) && (lower_case(CAP_NAME) != REAL_NAME)) {
        sWhatTargetSees += " (" + CAP(REAL_NAME) + ")";
    }

    // Else, they must be remote.
    if (!oTarget->catch_channel(wrap(sprintf("From afar, %s %s",
            CAP_NAME, sWhatTargetSees)), "remote")
      && !IS_APPLICANT(TP)) {
        printf("That player has %s remote soul off.\n",
          oTarget->query_possessive());
        return 1;
    } else {
        oTarget->add_channel_history("emote", wrap("From afar, "+CAP_NAME+" "+sWhatTargetSees));
    }

    // If their remote is off, tune it back on.
    if (TP->query_channels()["remote"] == 0) {
        write("Tuning remotes back on for you.\n");
        TP->query_channels()["remote"] = 1;
    }

    TP->catch_channel(wrap(sprintf("From afar, %s\n",
          (sWhatISee[0] == 'Y' ? "y" +
            sWhatISee[1..(strlen(sWhatISee) - 1)] : sWhatISee))), "remote");
    TP->add_channel_history("emote", wrap("From afar, " + sWhatISee));

    return 1;
}

// Get target's name.
string get_name(string sWho) {
    if(sWho && present(sWho, environment(this_player()))) {
        return present(sWho,environment(TP))->query_cap_name();
    }
    if (sWho && find_living(lower_case(sWho))) {
        return capitalize(sWho);
    }

    sWho = TP->check_alias(sWho);

    if (!sWho) return 0;

    if (find_living(lower_case(sWho))) {
        return capitalize(sWho);
    }

    return 0;
}

// Get target's pronoun.
string get_pronoun(string sWho) {
    object oObject;

    if (oObject = find_living(lower_case(sWho))) {
        return(oObject->query_pronoun());
    }

    sWho = TP->check_alias(sWho);

    if (!sWho) return 0;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_pronoun());
    }

    return 0;
}

// Get target's possessive.
string get_possessive(string sWho) {
    object oObject;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_possessive());
    }

    sWho = TP->check_alias(sWho);

    if (!sWho) return 0;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_possessive());
    }

    return 0;
}

// Get target's abs_possessive.
string get_abs_possessive(string sWho) {
    object oObject;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_abs_possessive());
    }

    sWho = TP->check_alias(sWho);

    if (!sWho) return 0;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_abs_possessive());
    }

    return 0;
}

// Get target's objective.
string get_objective(string sWho) {
    object oObject;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_objective());
    }

    sWho = TP->check_alias(sWho);

    if (!sWho) return 0;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_objective());
    }

    return 0;
}

// Get target's gender.
int get_gender(string sWho) {
    object oObject;

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_gender());
    }

    sWho = TP->check_alias(sWho);

    if (oObject = find_living(lower_case(sWho))) {
        return (oObject->query_gender());
    }

    return 0;
}


void sync_db() {
    object oConn;
    string sSQL, sEmote, sVerb, sRule, *asRule;
    string *asEmotes, *asVerbs, *asRules;
    int i, j, k, iCount;


    oConn = clone_object(DB_CONNECTION);
    oConn->open();

    // First, clear out the target table.
    sSQL = "DELETE FROM " + DB_TABLE;

    oConn->execute_single(sSQL);

    // Now, let's start populating.
    asEmotes = m_indices(emotes);
    for (i = 0; i < sizeof(asEmotes); i++) {

        asVerbs = m_indices(emotes[asEmotes[i]]);
        for (j = 0; j < sizeof(asVerbs); j++) {
            asRules = emotes[asEmotes[i]][asVerbs[j]];

            sEmote = asEmotes[i];
            sVerb = asVerbs[j];
            asRule = emotes[asEmotes[i]][asVerbs[j]];
            if (!sEmote) sEmote = "null";
            if (!sVerb) sVerb = "null";
            if (!sRule) sRule = "null";


            if (stringp(asRule)) {
                sRule = (string) asRule;
            } else if (sizeof(asRule) > 1) {
                sRule = implode(asRule, "<br>");
            }

            if (!sRule) sRule = "null";
            sRule = regreplace(sRule, "\n", "<br>", 1);
            sSQL = "INSERT INTO " + DB_TABLE + " " +
            "(emote, verb, action) VALUES (" +
            "'" + sEmote + "', " +
            "'" + sVerb + "', " +
            "'" + db_conv_string(sRule) + "')";

            oConn->execute_single(sSQL);
            //      oConn->auto_insert(DB_TABLE,
            //                          ([ "emote" : sEmote,
            //                             "verb"  : sVerb,
            //                             "action": sRule]));

        }
    }

    oConn->close();
}

