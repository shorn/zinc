import {useNavigation} from "Design/NavigationProvider";
import React, {useState} from "react";
import {
  AppBar,
  Hidden,
  IconButton,
  Menu,
  MenuItem,
  Toolbar
} from "@mui/material";
import {Cabbage} from "Component/Icon";
import {AccountCircle, Menu as MenuIcon} from "@mui/icons-material";
import Typography from "@mui/material/Typography";
import {AppDrawer} from "Design/AppDrawer";
import {getHelloWorldPageLink} from "Page/HelloWorldPage";
import {getScratchPageLink} from "Page/ScratchPage";
import {useAuthn} from "Auth/AuthenticationProvider";

const log = console;

export function AppNavBar(){
  const nav = useNavigation();

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppBar position="static">
      <Toolbar variant={"dense"}>
        <IconButton
          color="inherit"
          href={getHelloWorldPageLink()}
          onClick={event=>nav.navigateTo(getHelloWorldPageLink(), event)}
          size="large">
          <Cabbage/>
        </IconButton>
        <MenuShortcutBar>
          <MenuShortcutNavItem href={getScratchPageLink()}>
            Scratch
          </MenuShortcutNavItem>
        </MenuShortcutBar>

        {/*flexgrow pushes the icons over to the right */}
        <Typography variant="h6" color="inherit" style={{flexGrow: 1}} />
        <div>
          <AccountMenu/>
          <IconButton color="inherit" onClick={()=>setDrawerOpen(true)} size="large">
            <MenuIcon/>
          </IconButton>
          <AppDrawer anchor={"right"} open={drawerOpen}
            toggleDrawer={setDrawerOpen} />
        </div>

      </Toolbar>
    </AppBar>
  );
}

function MenuShortcutBar(props:{children: React.ReactNode}){
  return (
    <Hidden mdDown>
      <span style={{
        // Avoid shortcuts wrapping which causes AppBar to grow in height
        display: "flex", flexWrap: "nowrap", overflow: "hidden"
      }}>
        {props.children}
      </span>
    </Hidden>
  );
}

function MenuShortcutNavItem(props: {
  children: React.ReactNode,
  href: string,
}){
  const nav = useNavigation();
  return (
    <IconButton
      color="inherit"
      href={props.href}
      onClick={event=>nav.navigateTo(props.href, event)}
      size="large">
      {props.children}
    </IconButton>
  );
}



function AccountMenu(){
  const authn = useAuthn();
  const[ isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuAnchorRef = React.useRef<HTMLButtonElement>(null!);
  const nav = useNavigation();

  function onClose(){
    setIsMenuOpen(false);
  }

  return <>
    <IconButton
      ref={menuAnchorRef}
      onClick={()=> setIsMenuOpen(true)}
      style={{paddingRight: 20}}
      color="inherit"
      size="large">
      <AccountCircle/>
    </IconButton>

    <Menu id="menu-appbar"
      anchorEl={menuAnchorRef.current}
      anchorOrigin={{vertical: 'top', horizontal: 'right'}}
      transformOrigin={{vertical: 'top', horizontal: 'right'}}
      open={isMenuOpen}
      onClose={()=> setIsMenuOpen(false)}
    >
      <MenuItem onClick={()=>{
        // log.debug("authn identity and claims", identity, claim);
        onClose();
      }}>
        <Typography>Email {authn.email}</Typography>
      </MenuItem>
      <MenuItem onClick={async ()=>{
        log.debug("clicked logout");
        authn.signOut();
      }}>
        <Typography>Sign out</Typography>
      </MenuItem>
    </Menu>
  </>;
}

