/* Do not remove the headers from this file! see /USAGE for more info. */

#include <mudlib.h>

#define MSG_INDENT	8

/* General message handling.  Inherit it in anything that needs it.
 *
 * -Beek
 */

//:MODULE
// The message module.  The correct way to compose and send any messages
// To users is using this module, as it will automatically get the grammar
// right for each person involved.

/* More simul conversion fall out */
string punctuate(string s);
static private string vowels = "aeiouAEIOU";

nosave status tUseChanTokens;

#define A_SHORT(x) (objectp(x) ? remove_article(x->query_short()) : (member_array(x[0], vowels) == -1 ? "a " : "an ") + x)
#define SHORT(x) (objectp(x) ? remove_article(x->query_short()) : x)
#define THE_SHORT(x) (objectp(x) ? remove_article(x->query_short()) : "the " + x)
mapping messages = ([]);
mapping def_messages = ([]);



// added to fix up short things. Bob 18/05/2003
string remove_article(string sArg) {
    if (!stringp(sArg)) return sArg;
    if (lower_case(sArg[0..1]) == "a ") return sArg[2..];
    if (lower_case(sArg[0..2]) == "an ") return sArg[3..];
    if (lower_case(sArg[0..3]) == "the ") return sArg[4..];
    return sArg;
}

void set_use_chan_tokens(status tArg) { tUseChanTokens = tArg; }

void set_def_msgs(string type) {
  //    if (!(def_messages = MESSAGES_D->get_messages(type)))
  //        error("No messages of that type.\n");
}

void add_msg(string cls, string msg) {
    if (!messages) messages = ([]);
    if (pointerp(messages[cls]))
        messages[cls] += ({ msg });
    else if (messages[cls]) {
        messages[cls]=({ messages[cls], msg });
    } else
        messages[cls]=msg;
}

string query_msg(string which) { return messages[which] || def_messages[which];
}

void set_msgs(string cls, string *msgs) {
    if (!messages) messages = ([]);
    if(!msgs || !sizeof(msgs))  {
        m_delete(messages, cls);
        return;
    }
    messages[cls] = msgs;
}

void clear_messages() {
    messages = ([]);
}

//string *query_msg_types() {
//    return clean_array(m_indices(messages) + m_indices(def_messages));
//}

mixed * handle_ob(mixed ob, string res, mapping has) {
    string bit;
    
    if (objectp(ob) && has[ob]) bit = "it";
    else {
        if (res[<2..<1]=="a ") {
            res = res[0..<3];
            bit = A_SHORT(ob);
        } else if (res[<4..<1] == "the ") {
            res = res[0..<5];
            bit = THE_SHORT(ob);
        } else if (res[<2..<1] == "A ") {
            res = res[0..<3];
            bit = capitalize(A_SHORT(ob));
        } else if (res[<4..<1] == "The ") {
            res = res[0..<5];
            bit = capitalize(THE_SHORT(ob));
        } else bit = SHORT(ob);
        has[ob]++;
    }
    return ({ res, bit });
}

//:FUNCTION compose_message
//The lowest level message composing function; it is passed the object
//for whom the message is wanted, the message string, the array of people
//involved, and the objects involved.  It returns the appropriate message.
//Usually this routine is used through the higher level interfaces.

varargs string compose_message(object forwhom, string msg, object *who, 
  varargs mixed obs) {
    mixed ob;
    mixed fmt;
    string res;
    int i;
    int c;
    int z;
    int num, subj;
    string str;
    string bit;
    mapping has;
    mixed tmp;

    has = ([]);
    //    fmt = reg_assoc(msg, ({ "\\$[NnVvTtPpOoRr][a-z0-9]*" }), ({ 1 }) );
    fmt = regexplode(msg, "\\$[NnVvTtPpOoRr][a-z0-9]*");
    //fmt = fmt[0]; // ignore the token info for now
    
    res = fmt[0];
    i=1;
    while (i<sizeof(fmt)) {
        c = fmt[i][1];
        if (fmt[i][2] && fmt[i][2]<'a') {
            if (fmt[i][3] && fmt[i][3] < 'a') {
                subj = fmt[i][2] - '0';
                num = fmt[i][3] - '0';
                str = fmt[i][4..<0];
            } else {
                subj = 0;
                num = fmt[i][2] - '0';
                str = fmt[i][3..<0];
            }
        } else {
            subj = 0;
            num = ((c == 't' || c == 'T') ? 1 : 0); // target defaults to 1, not zero
            str = fmt[i][2..<0];
        }
        switch (c) {
        case 'o':
        case 'O':
            ob = obs[num];
            if (pointerp(ob)) {
                tmp = ({ res });
                for (z = 0; z < sizeof(ob); z++) {
                    tmp = handle_ob(ob[z], res, has);
                    ob[z] = tmp[1];
                }
                res = tmp[0];
                //bit = format_list(ob);
                bit = implode(ob, "");
            } else {
                tmp = handle_ob(ob, res, has);
                res = tmp[0];
                bit = tmp[1];
            }
            break;
        case 't':
        case 'T':
            /* Only difference between $n and $t is that $t defaults to $n1o */
            /* Fall through */
            if (str=="") str = "o";
        case 'n':
        case 'N':
            if (str=="") str = "s";
            if (str != "p") {
                /* Handle reflexification */
                if (subj < sizeof(who) &&
                  (who[subj] == who[num]) && has[who[subj]]) {
                    // objective: You kick yourself, Beek kicks himself.
                    if (str == "o") {
                        if (forwhom == who[subj]) bit = "yourself";
                        else bit = who[subj]->query_reflexive();
                    }
                    // objective: You kick him, Beek kicks him.
                    if (str == "b") {
                        if (forwhom == who[subj]) bit = "you";
                        else bit = who[subj]->query_objective();
                    }
                    // subjective: You prove you are stupid,
                    // Beek proves he is stupid.
                    if (str == "s") {
                        if (forwhom == who[subj]) bit = "you";
                        else bit = who[subj]->query_subjective();
                    }
                    if (str == "g") {
                        if (forwhom == who[subj]) bit = "you";
                        else
			  bit = (tUseChanTokens ? ("$N" + (subj + 1) + "$") :
						who[subj]->query_name());
                    }
                    break;
                }
                /* Other pronouns */
                if (who[num]==forwhom) {
                    bit = "you";
                    has[who[num]]++;
                    break;
                }
                if(str == "g") {
		  bit = (tUseChanTokens ? ("$N" + (num + 1) + "$") :
						who[num]->query_name());
                  has[who[num]]++;
                  break;
                }
                if (has[who[num]]) {
                    if (str[0]=='o') bit = who[num]->query_objective();
                    else bit = who[num]->query_subjective();
                    break;
                }
            }
            has[who[num]]++;
	    bit = (tUseChanTokens ? ("$N" + (num + 1) + "$") :
						who[num]->query_name());
            break;
        case 'R':
        case 'r':
            if (forwhom == who[num])
                bit = "yourself";
            else
                bit = who[num]->query_reflexive();
            break;
        case 'v':
        case 'V':
            /* hack for contractions */
            if (i + 1 < sizeof(fmt) && fmt[i+1][0..2] == "'t ") {
                str += "'t";
                fmt[i+1] = fmt[i+1][2..];
            }
            
            if (num >= sizeof(who) || who[num]!=forwhom) bit = M_GRAMMAR->pluralize(str, 1);
            else bit = str;
            break;
        case 'p':
        case 'P':
            if (forwhom == who[num]) {
                bit = "your";
                break;
            }
/* Cinco de Mayo 2004 - Thomas - Testing */
            if(str == "g") {
	      bit = (tUseChanTokens ? ("$N" + (num + 1) + "$'s") :
					who[num]->query_named_possessive());
              break;
            }
            if (has[who[num]] || str == "z") {
                bit = who[num]->query_possessive();
                break;
            }
	    bit = (tUseChanTokens ? ("$N" + (num + 1) + "$'s") :
					who[num]->query_named_possessive());
            has[who[num]]++;
            break;
        }
        // hack to prevent errors.
        if (!bit) bit = "";
        if (c < 'a') bit = capitalize(bit);
        //### Hack to avoid inheriting a mixin.  Better one needed.
        if (fmt[i+1][0] == '.')
            res += M_GRAMMAR->punctuate(bit) + fmt[i+1][1..];
        else
            res += bit + fmt[i+1];
        i+=2;
    }
    if ( strlen(res) > 0 && res[<1] != '\n' )
        res += "\n";
    return res;
}

//:FUNCTION action
//Make the messages for a given group of people involved.  The return
//value will have one array per person, as well as one for anyone else.
//inform() can be used to send these messages to the right people.
//see: inform

varargs string *action(object *who, mixed msg, varargs mixed obs) {
    int i;
    string *res;

    if (pointerp(msg))
        msg = msg[random(sizeof(msg))];
    res = allocate(sizeof(who)+1);
    for (i=0; i<sizeof(who); i++) {
      //res[i] = compose_message(who[i], msg, who, obs...);
      res[i] = apply(symbol_function("call_other"), this_object(), "compose_message", 
				     ({who[i], msg, who}) + obs);
    }
    //res[sizeof(who)]=compose_message(0, msg, who, obs...);
    res[sizeof(who)] = apply(symbol_function("call_other"), this_object(), "compose_message", 
				     ({0, msg, who}) + obs);
    return res;
}

//### This now always indents continuation lines.  Might want a flag at the
//### end to enable or disable that.
//:FUNCTION inform
//Given an array of participants, and an array of messages, and either an
//object or array of objects, deliver each message to the appropriate
//participant, being careful not to deliver a message twice.
//The last arg is either a room, in which that room is told the 'other'
//message, or an array of people to recieve the 'other' message.
string local_wrap(string str)
{
  int i;

  if ((i = strstr(str, "\n")) && (i != (strlen(str) - 1)))
    return str;

  str = sprintf("%-=75s", str);
  if (str[<2..] == "\n\n") return str[..<2];
  return str;
}
varargs void inform(object *who, string *msgs, mixed others, string channel) {
    int i;
    mapping done;
    mixed tmp;
    string sTmp;
    object oWho;

    done = ([]);

    for (i=0; i<sizeof(who); i++) {
        if (done[oWho = who[i]]) continue;
        done[oWho]++;
	tell_object(oWho, sTmp = local_wrap(msgs[i]));
	if (channel)
	  oWho->add_channel_history(channel, sTmp);
    }
    if (pointerp(others))
    {
      tmp = others - who;
      i = sizeof(tmp);
      while (i--)
	{
	  tell_object(tmp[i], sTmp = local_wrap(msgs[i]));
	  if (channel)
	    oWho->add_channel_history(channel, sTmp);
	}
    }
    else if (others)
    {
      foreach (object what : all_inventory(others) - who)
	{
	  tell_object(what, sTmp = local_wrap(msgs[sizeof(who)]));
	  if (channel)
	    what->add_channel_history(channel, sTmp);
	}
    }
}

//:FUNCTION simple_action
//Generate and send messages for an action involving the user and possibly
//some objects
varargs void simple_action(mixed msg, varargs mixed obs) {
    string us;
    string others;
    object *who;

    if( !sizeof( msg )) return;
    /* faster to only make who once */
    who = ({ this_object() });
    if (pointerp(msg))
        msg = msg[random(sizeof(msg))];

    //us = compose_message(this_object(), msg, who, obs...);
    us = apply(symbol_function("call_other"), this_object(), "compose_message", 
	       ({this_object(), msg, who}) + obs);
    //others = compose_message(0, msg, who, obs...);
    others = apply(symbol_function("call_other"), this_object(), "compose_message", 
		   ({0, msg, who}) + obs);

    tell_object(this_object(), us);
    tell_room(environment(this_object()), others, who );
}

//:FUNCTION my_action
//Generate and send a message that should only be seen by the person doing it
varargs void my_action(mixed msg, varargs mixed obs) {
    string us;
    object *who;

    if (!sizeof( msg )) return;
    who = ({ this_object() });
    if (pointerp(msg))
        msg = msg[random(sizeof(msg))];
    //us = compose_message(this_object(), msg, who, obs...);
    us = apply(symbol_function("call_other"), this_object(), "compose_message", 
	       ({this_object(), msg, who}) + obs);
    tell_object(this_object(), us);
}

//:FUNCTION other_action
//Generate and send a message that should only be seen by others
varargs void other_action(mixed msg, varargs mixed obs) {
    string others;
    object *who;

    if( !sizeof(msg)) return;
    who = ({ this_object() });
    if (pointerp(msg))
        msg = msg[random(sizeof(msg))];
    //others = compose_message(0, msg, who, obs...);
    others = apply(symbol_function("call_other"), this_object(), "compose_message", 
		   ({0, msg, who}) + obs);
    tell_room(environment(this_object()), others, who);
}

//:FUNCTION targetted_action
//Generate and send a message involving the doer and a target (and possibly
//other objects)
varargs void targetted_action(mixed msg, object target, varargs mixed obs) {
    string us, them, others;
    object *who;

    if( !sizeof(msg)) return;
    who = ({ this_object(), target });
    if (pointerp(msg))
        msg = msg[random(sizeof(msg))];
    //us = compose_message(this_object(), msg, who, obs...);
    us = apply(symbol_function("call_other"), this_object(), "compose_message", 
	       ({this_object(), msg, who}) + obs);
    //them = compose_message(target, msg, who, obs...);
    them = apply(symbol_function("call_other"), this_object(), "compose_message", 
		 ({target, msg, who}) + obs);
    //others = compose_message(0, msg, who, obs...);
    others = apply(symbol_function("call_other"), this_object(), "compose_message", 
		   ({0, msg, who}) + obs);
    tell_object(this_object(), us);
    tell_object(target, them);
    tell_room(environment(this_object()), others, who);
}
