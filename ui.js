// Carlos Marente, Ajax, Data and User Interface Library
// 25/06/2012
// Requires jquery-1.7.2.min.js

var UI = UI || { Ajax : {}, 
		   Base64 : {},
		   KeyUpDelay : 600,		   
		   KeyUpTimer : null,
		   ProgressImg : null,
		   Browser : { ID : 0,
					   SupportsHTML5 : false },
		   Browsers : { IE : 0,
						Chrome : 1,
						Firefox : 2,
						Safari : 3,
						Opera : 4,
						Android : 5,
						BlackBerry : 6,
						IEMobile : 7,
						OperaMini : 8,
						OperaMobile : 9,
						SymbianS60 : 10,
						Konqueror : 11,
						IE10 : 12,
						IE9 : 13,
						IE8 : 14,
						IE7 : 15,
						IE6 : 16 },	
			Theme : {}
		  },

Theme_red = {	
	Name : "red",
	Colors : { Base : "#B72727", Dark: "#B72727", Light: "#f74f4f", Highlight: "#f74f4f" },
	Font : { Size : "10pt", Color: "black", Weight : "normal" } ,
	TextBox : { Border : { Color: "#c31b1b", Width: "1px", Style: "solid", Radius: "3px"} },
	Button : { Font : { Color: "#c31b1b", Weight: "bold", Size: "10pt"} }, //f34b4b
	Panel : { Image : "'/gradient-red-64.png'"  },
	Grid: { Border: { 	Color : "#f34b4b",
			 					Width : "1px",
			 					Style : "solid" },
			PageNavigator:{	Font : { Size : "9pt", Color : "#B72727" },
				  			CurrentPage : { Font : { Size : "12pt", Color : "#E72727", Weight : "normal" } }
						  },
			Background: "#FEB9B9", 
			SearchBox : { Size : 50 },
			Header :  { Font: {	Color : "white",
		  						Weight : "bold",
				  				Size : "9pt"},
				  		Background: "#960505",
				  		Image : "'/gradient-red-24.png'" 
				  		}
		}

 },

 Theme_marine = {	
 	Name : "marine",
 	Colors : { Base : "#31889E", Dark: "#31889E", Light: "#A8D8E3", Highlight: "#BEE5EF" },
 	Font : { Size : "10pt", Color : "black", Weight : "normal" } ,
	TextBox : { Border : { Color: "#31889E", Width : "1px", Style : "solid", Radius : "3px"} },
	Button : { Font : { Color : "#31889E", Weight : "bold", Size : "10pt"} },
	Panel : { Image : "'/gradient-marine-64.png'"  },
	Grid: { Border: { 	Color : "#A8D8E3",
			 					Width : "1px",
			 					Style : "solid"
				  			},
			PageNavigator:{	Font : { Size : "9pt", Color : "#31889E" },
				  			CurrentPage : { Font : { Size : "12pt", Color : "#31889E", Weight : "normal" } }
						  },
			Background: "#DCECFF", 
			SearchBox : { Size : 50 },
			Header :  { Font: {	Color : "white",
		  						Weight : "bold",
				  				Size : "9pt"},
				  		Background: "#31889E",
				  		Image : "'/gradient-marine-24.png'" 
				  		}
		}};

UI.Theme = Theme_marine;

// IE < 9 not supports trim, then , add it
if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}

// PageManager Object for Dataset
function PageManager(rowsPerPage)
{
	this.CurrentPage = -1;
	this.PageCount = 0;	
	this.Direction = ">";
	this.Filter = "";  
	this.RowsPerPage = 500;
	if (rowsPerPage && (typeof rowsPerPage != "undefined")) this.RowsPerPage = rowsPerPage; 
}

// ****************************************************************************************
// * Dataset class                                                                        *
// * **************************************************************************************

// DataSet class, manage JSON Data, and data paging, supports sync or async mode for receive data
// for async mode pass a function as "onReceiveData" parameter
function DataSet(url, entity, dsname, rowsPerPage, navCallback, onReceiveData) { 
	var request;

	this._tempData = null;
	this._sortType = 1;
	this._lastSortField = "";
	this.Data = null;
	this.RowCount = 0;
	this.PageManager = new PageManager(rowsPerPage);	
	this.OnNavigate = navCallback;
	this.Grid = null;

	this.FromRow = 0;
	this.ToRow = 0;
	this.Name = dsname;
	this.Loading = false;
	this.Entity = entity;
	this.FilterValue = "";	

	var self = this;

	if (onReceiveData && (typeof onReceiveData != "undefined"))
		 request = UI.Ajax.Get(url, function(request) { self.Open(request); onReceiveData(self); } );
	else 
	{	
		request = UI.Get(url);
		this.Open(request);
	}	
}

DataSet.prototype.Open = function(request) 
{
	this.Data = eval("(" + request.responseText + ")"); 
	this.UpdateRowCount();			
}

DataSet.prototype.UpdateRowCount = function()
{
	this.RowCount = this.Data[this.Entity].length;	
	this.PageManager.PageCount = (this.RowCount / this.PageManager.RowsPerPage) | 0;
	if (this.RowCount % this.PageManager.RowsPerPage > 0) this.PageManager.PageCount++;
}

// Dataset navigation throw pages
DataSet.prototype.CheckPage = function(APage, filtering) 
{	
	if (this.Loading) return false;
	if ((!filtering) && (this.PageManager.CurrentPage == APage)) return false;

	this.PageManager.Direction = ">";
	
	if (APage < this.PageManager.CurrentPage) this.PageManager.Direction = "<=";

	if (APage <= 1) 
	{					
		APage = 1;	
		this.PageManager.Filter = '';
	}
	
	this.UpdateRowCount();

	if  (APage > this.PageManager.PageCount)
		APage = this.PageManager.PageCount;
	
	if (APage <= 0) APage = 1;
	this.PageManager.CurrentPage = APage;	

	// update rows range
	this.FromRow = ((this.PageManager.CurrentPage-1) * this.PageManager.RowsPerPage)+1;
	this.ToRow = this.PageManager.CurrentPage * this.PageManager.RowsPerPage;
	if (this.ToRow > this.RowCount) this.ToRow = this.RowCount;

	var RI = UI.$$('#' + this.Name + '-RowInfo');
	if (RI) RI.innerHTML = this.RowInfo();
	var PN = UI.$$('#' + this.Name + '-PageNavigator');
	if (PN) PN.innerHTML = this.PageNavigator();

	this.Loading = true;
	return true;
}

DataSet.prototype.RowInfo = function() 
{ 
	return "Pág. <b>" + this.PageManager.CurrentPage + "</b> de " + this.PageManager.PageCount + " (reg." + this.FromRow + ".." + this.ToRow + "/" + this.RowCount + ")";
}

DataSet.prototype.PageNavigator = function() 
{ 
	var str = '';
	var i;
	for (i = 1; i < this.PageManager.PageCount+1; i++)
	{
		if (i == this.PageManager.CurrentPage)
			 str += '<a style="color:' + UI.Theme.Grid.PageNavigator.CurrentPage.Font.Color + ';font-size:' + UI.Theme.Grid.PageNavigator.CurrentPage.Font.Size + ';font-weight:bold;text-shadow: 0 0 0.5em #999, 0 0 0.5em #999, 0 0 0.5em #999;" href="javascript:' + this.Name + '.GotoPage(' + i + ')" >' + i + '</a>&nbsp;&nbsp;';
		else {	str += '<a style="color:' + UI.Theme.Grid.PageNavigator.Font.Color + ';font-size:' + UI.Theme.Grid.PageNavigator.Font.Size + '" href="javascript:' + this.Name + '.GotoPage(' + i + ')" >' + i + '</a>'; 
				if( i < this.PageManager.PageCount) str += '&nbsp;&nbsp;' }
	}
	return str;
}

DataSet.prototype.Next = function()
{
	try
	{		
		if (!this.CheckPage(this.PageManager.CurrentPage+1)) return;
		this.FireOnNavigate(); 
		this.Loading = false;
	}
	catch(e){ this.Loading = false; throw e.message; }
}

DataSet.prototype.Prior = function()
{
	try
	{
		if (!this.CheckPage(this.PageManager.CurrentPage-1)) return;
		this.FireOnNavigate();
		this.Loading = false;
	}
	catch(e){ this.Loading = false; throw e.message; }
}

DataSet.prototype.First = function()
{
	try
	{	
		if (!this.CheckPage(1)) return;
		this.FireOnNavigate();
		this.Loading = false;
	}
	catch(e){ UI.Loading = false; throw e.message; }
}

DataSet.prototype.Last = function()
{
	try
	{	
		if (!this.CheckPage(this.PageManager.PageCount)) return;
		this.FireOnNavigate();
		this.Loading = false;
	}
	catch(e){ this.Loading = false; throw e.message; }
}

DataSet.prototype.GotoPage = function(Page)
{	
	try
	{	
		if (!this.CheckPage(Page)) return;
		this.FireOnNavigate();
		this.Loading = false;
	}
	catch(e){ this.Loading = false; throw e.message; }
}

// searchs a key word on properties of a given row
DataSet.prototype.FindWord = function(row, f)
{
	var p, v;

	for (p in row)			
	{											
		v = row[p].toLowerCase();
		if (v.indexOf(f) >= 0) return true;
	}
	return false;
}

// multi-word "and" filter
DataSet.prototype.Filter = function(str, self)
{
	try
	{	
		var grid;
		if (self.Grid) grid = self.Grid.Element();

		str = str.toLowerCase();

		if (self.FilterValue == str) { self.Loading = false; return; }
		self.FilterValue = str;

		clearTimeout(UI.KeyUpTimer);	
		UI.ShowProgress(grid);
		
		UI.KeyUpTimer = setTimeout(
			function(){						
				if ((!self._tempData) || (typeof self._tempData == "undefined")) 
					self._tempData = UI.CloneObject(self.Data);

				if (str == '') { 
					self.Data = UI.CloneObject(self._tempData); 
					self._tempData = null; 
					self.CheckPage(1, true);
					self.FireOnNavigate();
					self.Loading = false;
					return; 
				}
				
				
				var i, j, r, match;
				if (self._tempData)
				{					
					self.Data[self.Entity] = [];
					var RC = self._tempData[self.Entity].length;
					var find = str.split(" "); 
					
					for (i=RC-1; i >= 0; i--) 
					{
						r = self._tempData[self.Entity][i];						
						match = true;

						for (j = find.length-1; j >= 0; j--)
						{							
							if (!self.FindWord(r, find[j])) {
								match = false; 
								break; 
							}
						}
						
						if (match) self.Data[self.Entity].push(r);
					}	
				 	self.CheckPage(1, true);
					self.FireOnNavigate();	
					self.Loading = false;		
				}
		}, UI.KeyUpDelay);

		UI.HideProgress(grid);
	}
	catch(e)
	{
		self.Loading = false;
		UI.HideProgress(grid);
	}
}

DataSet.prototype.Sort = function(field, th)
{
	if (this._lastSortField != field) {
		this._sortType = 1;
		this._lastSortField = field;
	}
	else this._sortType = -this._sortType;
	
	var dir = this._sortType;

	this.Data[this.Entity].sort( 
		function(a, b) { 			
			if (typeof a[field] == "number")
				return (a[field] > b[field]) * dir;
			if (typeof a[field] == "boolean")
				return (a[field] > b[field]) * dir;
			if ((typeof a[field] == "string") || (typeof a[field] == "undefined"))
				return  a[field].localeCompare(b[field]) * dir;			
		} 
	);
	
	if (th)
	{		
		var P = th.parentNode;
		if (P.nodeName != "TR") P = P.parentNode;

		$('.sortColASC', P).removeClass('sortColASC');
		$('.sortColDESC', P).removeClass('sortColDESC');

		if (dir == 1)
			 $(th).addClass('sortColASC');
		else $(th).addClass('sortColDESC');
	}

	this.FireOnNavigate();
}

DataSet.prototype.FireOnNavigate = function()
{
	if ((this.OnNavigate) && (typeof this.OnNavigate != "undefined")) { this.OnNavigate(this); return true;	}
	return false;	
}

// ****************************************************************************************
// *                                                                                      *
// * Visual components classes                                                            *
// *                                                                                      *
// * **************************************************************************************

// UI enumerations
UI.Align = { Custom: 0, Top: 1, Bottom: 2, Left: 3, Right: 4, Client: 5 };
UI.Margin = { Left: 0, Top: 0, Right: 0, Bottom: 0 };
UI.Padding = { Left: 0, Top: 0, Right: 0, Bottom: 0 };
UI.SizeConstraints = { MaxWidth: 0, MaxHeight: 0, MinWidth: 0, MinHeight: 0 };
UI.Anchors = { Left: 0, Top: 1, Right: 2, Bottom: 3 } ;


// ****************************************************************************************
// * Background wrapper class                                                             *
// * **************************************************************************************

function Background(Owner)
{
	_Color = UI.Theme.Colors.Dark;
	_Image = "";
	_Repeat = "no-repeat";
	_Position = "0% 0%";
	_Attach = "scroll";
	_Owner = Owner;	

	this.Color = function() { return _Color; }
	this.Image = function() { return _Image; }
	this.Repeat = function() { return _Repeat; }
	this.Position = function() { return _Position; }
	this.Attach = function() { return _Attach; }
	this.Owner = function() { return _Owner; }

	this.setColor = function(v) { 
		_Color = v; 
		if (_Owner != undefined) $(_Owner.Element()).css('background-color', v); 	
	}
	
	this.setImage = function(v) {
		_Image = v;
		if (_Owner != undefined) $(_Owner.Element()).css('background-image', v);
	} 
	
	this.setRepeat = function(v) { 
		_Repeat = v;
		if (_Owner != undefined) $(_Owner.Element()).css('background-repeat', v);
	} 
	
	this.setPosition = function(v) { 
		_Position = v;
		if (_Owner != undefined) $(_Owner.Element()).css('background-position', v);
	}
	
	this.setAttach = function(v) { 
		_Attach = v;
		if (_Owner != undefined) $(_Owner.Element()).css('background-attachment', v);
	}
	this.setOwner = function(v) { _Owner = v; }
}

// ****************************************************************************************
// * Border wrapper class                                                                 *
// * **************************************************************************************

function Border(Owner)
{
	_Color =  UI.Theme.Colors.Dark;
	_Width = "1px";
	_Style = "solid";
	_Owner = Owner;

	this.Color = function() { return _Color; }
	this.Width = function() { return _Width; }
	this.Style = function() { return _Style; }
	this.Owner = function() { return _Owner; }

	this.setColor = function(v) { 
		_Color = v; 		
		if (_Owner != undefined) $(_Owner.Element()).css('border', v); 
	}

	this.setWidth = function(v) { 
		_Width = v; 		
		if (_Owner != undefined) $(_Owner.Element()).css('border-width', v); 
	}

	this.setStyle = function(v) { 
		_Style = v; 		
		if (_Owner != undefined)$(_Owner.Element()).css('border-style', v);
	}
	this.setOwner = function(v) { _Owner = v; }
}

// ****************************************************************************************
// * Control ancestor class                                                               *
// * Normally all visual controls must inherit from Control                               *
// * **************************************************************************************

function Control()
{
	_Element = null;
	_Parent = null;
	_Align = UI.Align.Custom;
	_Left = 0;
	_Top = 0;
	_Width = 0;
	_Height = 0;
	_Visible = true;
	_Enabled = true;     
    _Margin = UI.Margin;
    _Padding = UI.Padding;
    _Background = new Background(this);
	_Border = new Border(this);
    _Cursor = "default";
    _Font = UI.Theme.Font;
    _Sizeable = false;
    _Hint = "";
    _zIndex = 0;
    _TabOrder = 0;
    _Transparency = 0;
    _Id = "";

    this.Element = function() { return _Element; }
    this.Parent = function() { return _Parent; }
    this.Align = function() { return _Align; }
	this.Left = function() { 
		if (_Element) { 
			var p = UI.Position(_Element); 
			_Left = p[0]; 
			return p[0]; 
		}
		else { return _Left; }
	}

	this.Top = function() {
	if (_Element) { 
		var p = UI.Position(_Element); 
			_Top = p[1]; 
			return p[1]; 
		}
		else { return _Top; }
	}

	this.Width = function() { return _Width; }
	this.Height = function() { return _Height; }
	this.Visible = function() { return _Visible; }
	this.Enabled = function() { return _Enabled; }
	this.Margin = function() { return _Margin; }
	this.Padding = function() { return _Padding; }
	this.Background = function() { return _Background; }
	this.Border = function() { return _Border; }
	this.Cursor = function() { return _Cursor; }
	this.Font = function() { return _Font; }
	this.Sizeable = function() { return _Sizeable; }
	this.Hint = function() { return _Hint; }
	this.zIndex = function() { return _zIndex; }
	this.TabOrder = function() { return TabOrder; }
	this.Transparency = function() { return _Transparency; }
	this.Id = function() { return _Id; }

	this.setElement = function(v) { _Element = v; }
	this.setParent = function(v) { if (typeof v == "string") v = UI.$$(v); _Parent = v; }
	this.setAlign = function(v) { _Align = v; }
	this.setLeft = function(v) { if(typeof v != "string") v = v + "px"; _Left = v; _Element.style.left = v; }
	this.setTop = function(v) { if(typeof v != "string") v = v + "px"; _Top = v; _Element.style.top = v; }
    this.setWidth = function(v) { _Width = v; if (_Element) _Element.style.width = v; }
    this.setHeight = function(v) { _Height = v; if (_Element) _Element.style.Height = v; }
	this.setVisible = function(v) { _Visible = v; }
	this.setEnabled = function(v) { _Enabled = v; }
	this.setMargin = function(v) { _Margin = v; }
	this.setPadding = function(v) { _Padding = v; }
	this.setBackground = function(v) { _Background = v; }
	this.setBorder = function(v) { _Border = v; }
	this.setCursor = function(v) { _Cursor = v; }
	this.setFont = function(v) { _Font = v; }
	this.setSizeable = function(v) { _Sizeable = v; }
	this.setHint = function(v) { _Hint = v; }
	this.setzIndex = function(v) { _zIndex = v; }
	this.setTabOrder = function(v) { _TabOrder = v; }
	this.setTransparency = function(v) { _Transparency = v; }
	this.setId = function(v) { if ((!v) || (v.trim()=="")) v = this.checkId(''); _Id = v; }

    return this;
    //this.__defineGetter__("Left", function(){ return this.fLeft; }); IE<=9 does not supports this!   
    //this.__defineSetter__("Left", function(val){ this.fLeft = val; });	
}

Control.prototype.checkId = function(id)
{
	if ((id == '') || (id == null) || (typeof id == "undefined")) return "ctrl-"+UI.guid(); else return id;
}


// ****************************************************************************************
// * DBGrid class, data grid, binding to Dataset object                                   *
// ****************************************************************************************

// Creates a new grid binded to the provided Dataset
// cols is a JSON string containing an array of the following object, with the column information: 
// { title : "", align : "left", width : "200px", field : "" }
// showSearch : show|hide search input box
// showButtons: show|hide first/prev/next/last page buttons
// showRowInfo: show|hide information label with current page and records showed
// showPages  : show|hide page shortcut links

function DBGrid(ds, parent, title, cols, selRowCallback, renderCallback, showSearch, showButtons, showRowInfo, showPages)
{
	this.setParent(parent);

	//if (typeof parent == "string") 
	//	parent = UI.$$(parent);

	if (typeof showSearch == "undefined") showSearch = true;
	if (typeof showButtons == "undefined") showButtons = true;
	if (typeof showRowInfo == "undefined") showRowInfo = true;
	if (typeof showPages == "undefined") showPages = true;
	if (typeof renderCallback == "undefined") renderCallback = this.Render;
	if (typeof selRowCallback != "string")  selRowCallback = "SelectRow";

	cols = eval('(' + cols + ')');
	
	this.Dataset = ds;
	this.Columns = cols;
	this.OnSelectRow = selRowCallback;
	this.OnRender = renderCallback;
	//this.Parent = parent;	

	var f, html =		
	'<div>\n' +
	'	<div class="grid-navigator">\n';

	if (showSearch)
		html += '<label class="label">Buscar </label><input type="text" id="SearchBox" class="text-box" style="border-color:' + UI.Theme.TextBox.Border.Color + '!important;border-width:' + UI.Theme.TextBox.Border.Width + '!important;border-style:' + UI.Theme.TextBox.Border.Style + '!important;" size="' + UI.Theme.Grid.SearchBox.Size + '" onKeyUp="' + ds.Name + '.Filter(this.value, ' + ds.Name + ')"></input>\n';

	if (showButtons)
		html += '<button onclick="' + ds.Name + '.First()" style=""><span style="color:' + UI.Theme.Button.Font.Color + '">|&lt;</span></button>\n' +
				'<button onclick="' + ds.Name + '.Prior()" style=""><span style="color:' + UI.Theme.Button.Font.Color + '">&lt;&lt;</span></button>\n' +
				'<button onclick="' + ds.Name + '.Next()" style=""><span style="color:' + UI.Theme.Button.Font.Color + '">&gt;&gt;</span></button>\n' +
				'<button onclick="' + ds.Name + '.Last()" style=""><span style="color:' + UI.Theme.Button.Font.Color + '">&gt;|</span></button>\n';

	if (showRowInfo) 
		html += '<label  class="label" id="' + ds.Name + '-RowInfo"></label>\n';

	if (showPages)
		html += '<div class="grid-page-navigator" id="' + ds.Name + '-PageNavigator"></div>\n';
	
	html +=
	'	</div>\n' +
	'	<h3 style="padding-top:8px"> ' + title + '</h3>\n' +
	'</div>\n' +	 
	'<div class="grid" style="background:' + UI.Theme.Grid.Background + ';border-color:' + UI.Theme.Grid.Border.Color + ';border-width:' + UI.Theme.Grid.Border.Width + ';border-style:' + UI.Theme.Grid.Border.Style;

	if (showPages || showRowInfo || showButtons || showSearch)
		html += ';margin-top:20px;';

	html += '">\n' +
	'	<table cellspacing="1px" style="border-color:#31889E" class="grid-header-table">' +
	'		<tr class="grid-header-bg" style="background-color:' + UI.Theme.Grid.Header.Background + ';background-image: url(' + UI.Theme.Grid.Header.Image + ')!important;color:' + UI.Theme.Grid.Header.Font.Color + ';font-weight:' + UI.Theme.Grid.Header.Font.Weight + ';font-size:' + UI.Theme.Grid.Header.Font.Size + ';">';
	var w, i, col;
	for (i=0; i < cols.length; i++)
	{		
		col = cols[i];
		w = col.width;
		if (col.titleWidth) w = col.titleWidth;

		html += '<th align=' + col.align + ' width="' + w + '"><a id="c'+ col.field.replace(/\s/g, "") +'" onclick="' + ds.Name + '.Sort(\'' + col.field + '\', this)">' + col.title + '</a></th>\n';
	}
	
	html +=
	'		</tr>\n'+
	'	</table>\n'+
	'	<div class="Scrollable" style="height:expression(this.scrollHeight > 307 ? 308px : auto );max-height: 308px">\n'+
	'		<table id="grid-' + ds.Name + '" class="grid-content-table">\n'+
	'		</table>\n'+
	'	</div>\n'+					
	'</div>';

	this.Parent().innerHTML = html;
	this.Name = '#grid-' + ds.Name;
	this.setElement(UI.$$(this.Name));

	this.Dataset.Grid = this;

	f = cols[0].field.replace(/\s/g, "");

	$('#c' + f).addClass('sortColASC');
	this.Dataset._lastSortField = cols[0].field;

	if (typeof this.Dataset.OnNavigate == "undefined") this.Dataset.OnNavigate = this.OnRender;

	return this;
}

DBGrid.prototype = new Control();  // inheritance

DBGrid.prototype.Render = function(DS)
{
	var G
	
	try
	{			
		if (this.Grid) G = this.Grid.Element();
		var TR, i, j, r, C, Col;		
		var NewGrid = false;

		UI.ShowProgress(G);
		NewGrid = UI.PrepareGrid(G, this);
		r = 0;

		for (i=this.FromRow-1; i < this.ToRow; i++)
		{	
			if (NewGrid) TR = G.insertRow(r); else TR = G.rows[r];
			r++;					

			for (j=0; j<this.Grid.Columns.length; j++)				
			{		

				Col = this.Grid.Columns[j];				
				C = UI.SetCell(j, NewGrid, TR, this.Data[this.Entity][i][Col.field], Col.align, Col.width); //For UI.FindOnGrid: SearchText += UI.GetSearchText(C); // Nombre
			}
			TR.setAttribute('onmouseover', 'UI.ChangeColor(this, true)');
			TR.setAttribute('onmouseout', 'UI.ChangeColor(this, false)');
			TR.setAttribute('onclick', "$('tr', '" +  this.Grid.Name + "').css('fontWeight', 'normal'); this.style.fontWeight = 'bold';" + this.Grid.OnSelectRow + "(" + this.Name + ", " + i +")");
			//For UI.FindOnGrid: TR.setAttribute('ST', SearchText.toLowerCase());
			
			if ((i + 1) % 2 == 0) 
				 TR.style.background = UI.Theme.Grid.Background;
			else TR.style.background = "white";
		}			

		UI.HideProgress(G);
	}
	catch(e)
	{
		UI.HideProgress(G);				
		var cell = G.insertRow(0).insertCell(0);
		cell.innerHTML = "Error al cargar los datos: " + e.toString();
		cell.style.color = "red";						
	}
}

UI.Dialog = function (parent, id, width, height, left, top, HTML, title)
{
	this.setParent(parent);
	this.setId(id);
	
	var E = UI.$$('#' + this.Id());

	

	if (!E)
	{
		var html = '<div div class="dialog draggable" style="position:absolute" id="' + this.Id() + '"></div>';	
		$(this.Parent()).prepend(html);
		this.setElement(UI.$$('#' + this.Id()));
		this.setLeft(left);
		this.setTop(top);
		this.setWidth(width);
		this.setHeight(height);		
	}
	
	this.setElement(UI.$$('#' + this.Id()));
	this.Element().style.display = 'block';	
	this.Element().innerHTML = HTML;		
	this.Background().setColor(UI.Theme.Colors.Highlight);

	this.Border().setColor(UI.Theme.Colors.Dark);
	this.Border().setWidth("1px");
	this.Border().setStyle("solid");
	this.Dragging = false;
	this.OffsetX = 0;
	this.OffsetY = 0;

	this.Element().onmouseup = function(event) { 
		this.Dragging = false; 
		this.style.opacity = 1;
		this.style.filter = 'alpha(opacity=' + 100 + ')';
		document.onselectstart = function(){ return true; } 
	}
	this.Element().onmousedown = function(event){ 
		if ((!event) || (event == undefined)) event = window.event;
		this.Dragging = true; 
		this.OffsetX = parseInt(this.style.left) - event.clientX; 
		this.OffsetY = parseInt(this.style.top) - event.clientY; 
		
		document.onselectstart = function(){ return false; }
	}
	this.Element().onmousemove = function(event) { if (this.Dragging) { 
		if ((!event) || (event == undefined)) event = window.event;

		this.style.opacity = 0.7;
		this.style.filter = 'alpha(opacity=' + 70 + ')';

		var x = event.clientX + this.OffsetX, y = event.clientY + this.OffsetY;

		x += "px";
		y += "px";

		this.style.left = x; 
		this.style.top = y; }
	};

	new UI.Panel(this.Element(), null, null, 20, 0, 0, "<div onclick=\"UI.$$('#" + this.Id() + "').style.display='none';\" onmouseover=\"$(this).addClass('icon-closethick');\" onmouseout=\"$(this).removeClass('icon-closethick');\" style='float:right' class='icon icon-close'></div><span style='padding-left:4px;font-weight:bold;font-size:10pt;color:" + UI.Theme.Colors.Dark +"'>" + title + "</span>");
	return this;
}
UI.Dialog.prototype = new Control(); 

// ****************************************************************************************
// Panel class, div wrapper                                                               *
// ****************************************************************************************

UI.Panel = function (parent, id, width, height, left, top, HTML, align)
{
	var html;

	this.setParent(parent);	
	this.setId(id);

	html = '<div class="panel" id="' + this.Id() + '"></div>';	
	$(this.Parent()).prepend(html);
	this.setElement(UI.$$('#' + this.Id()));

	this.setAlign(align);
	this.setLeft(left);
	this.setTop(top);
	this.setWidth(width);
	this.setHeight(height);
	this.Element().innerHTML = HTML;
}

UI.Panel.prototype = new Control(); 

// ****************************************************************************************
// * UI Object, singleton, library main object                                            *
// * **************************************************************************************

// Creates a new HTTPRequest
UI.Ajax.Request = function () {
	if (typeof XMLHttpRequest != 'undefined')
		return new XMLHttpRequest();
	else if (window.ActiveXObject) {
		var avers = ["Microsoft.XmlHttp", "MSXML2.XmlHttp",	"MSXML2.XmlHttp.3.0", "MSXML2.XmlHttp.4.0", "MSXML2.XmlHttp.5.0"];
		var i;
		for (i = avers.length -1; i >= 0; i--) {
			try {
				httpObj = new ActiveXObject(avers[i]);
				return httpObj;
			} catch(e) {}
		}
	}
	throw new Error('XMLHttp (AJAX) not supported');
}

// Ajax GET Call
UI.Ajax.Get = function(URL, callback)
{
    var request = UI.Ajax.Request();	
	request.open('GET', URL, true);  
	request.send(null);
	request.onreadystatechange = function() { if (request.readyState == 4) { callback(request); }};
	return request;
}

// Synchronous GET call
UI.Get = function(URL)
{
	var request = UI.Ajax.Request();	
	request.open('GET', URL, false); 
	request.send(null); 
	return request;
}	

// Utility function for search and return element(s) on DOM
UI.$$ = function(id, parent) 
{
	if ((arguments.length < 2) || (!parent) || (typeof parent == "undefined")) parent = document;

	if (id.slice(0, 1) == '#') // By Id    
		 return parent.getElementById(id.replace('#', ''));
	else 
	{
		if (id.slice(0, 1) == '.') // By class
		     try
		 	 {
		         return parent.getElementsByClassName(id.replace('.', ''));
		     }
		     catch(e)
		     {
		     	return $(id, parent);
		     }
		else 
		{
			if (id.slice(0, 1) == '@') // By name
				 return parent.getElementsByName(id);
			else return parent.getElementsByTagName(id); // By Tag
		}
	}
}

// Swap background color of an element
UI.ChangeColor = function (element, highLight)
{	
	if (highLight)
    {
       element.setAttribute("OriginalColor", element.style.backgroundColor);
	   element.style.backgroundColor = UI.Theme.Colors.Highlight;
    }
    else
    {	
       element.style.backgroundColor = element.getAttribute("OriginalColor");
    }	 
}

UI.ShowProgress = function(Control)
{
	if (this.ProgressImg) this.ProgressImg.style.display = 'block';
	if (Control) Control.style.display = 'none';
	document.body.style.cursor = 'wait';
}

UI.HideProgress = function(Control)
{
	if (this.ProgressImg) this.ProgressImg.style.display = 'none';
	if (Control) 
	{
		if (Control.nodeName.toLowerCase() == 'table')
			 Control.style.display = 'table';
		else Control.style.display = 'block';
	}	
	document.body.style.cursor = 'default';
}

// Delete all rows of a table element
UI.ClearTable = function(Table)
{
    var body = Table.getElementsByTagName("tbody");
	if (body.parentNode) body.parentNode.removeChild(body);
	
	while (Table.rows.length > 0) Table.deleteRow(0);
}

// Filter rows on a table according to the value of a given input text element
UI.FindOnGrid = function (input, grid)
{
	try
	{
		clearTimeout(this.KeyUpTimer);	
		this.ShowProgress(grid);
		
		this.KeyUpTimer = setTimeout(
			function(){
			var s = input.value.toLowerCase();	
			var rows = grid.rows;
			var f, r, i;
			
			if (rows)
			{
				var RC = rows.length-1;
				
				for (i=RC; i >= 0; i--) 
				{
					r = rows[i];				
					f = r.getAttribute('ST');				
					if (f.indexOf(s) >= 0)
						 r.style.display = 'table-row';
					else r.style.display = 'none';
				}				
			}
		}, this.KeyUpDelay);
		this.HideProgress(grid);
	}
	catch(e)
	{
		this.HideProgress(grid);
	}
}

UI.ParseDate = function (d)
{
	if ((d) && (d.length > 16))
	{
		var h = d.slice(11);
		
		if (h[1] == ":") h = "0" + h;
		if (h.length > 5) h = h.slice(0, 5);
		return d.slice(0, 10) + " " + h;
	}
	else 
	{
	    if (d  === "undefined") 
		     return this.Now(false);
		else{			
			if (d.length < 12) d = d + " 00:00";
			return d;
		}
	}
}

// Autocompletion combobox with filter search
UI.Combo = function (id, h, l, list) {
	var self = this; 
	self.h = h; 
	self.l = l; 
	self.inp = document.getElementById(id); 
	self.hasfocus = false; 
	self.sel = -1; 
	
	// if (list)
		 // self.ul = document.getElementById(list); 
	// else {
	self.ul = self.inp.nextSibling; 
	
	if (typeof list != "undefined") self.ul = list;

	while (self.ul.nodeType == 3) 
	   self.ul = self.ul.nextSibling; 		
	// }
		
	// self.list.style.top = self.inp.style.top + 3;
	self.inp.style.zindex = 0;
	
	var w = self.inp.style.width;

	if (w.indexOf("px") > -1)
	{
	   w = w.slice(0, -2);
	   var intW = parseInt(w);
	   intW = intW-3;
	   w = intW + "px";
	}
	else w = w-3;
	
	self.ul.style.width = w;
	self.ul.style.right = "3px";
	
	self.list = self.ul.getElementsByTagName('li');
	self.ul.onmouseover = function() {  self.ul.className = ''; }; 									
	self.ul.onmouseout = function() { self.ul.className = 'focused'; if (!self.hasfocus) self.ul.style.display = 'none'; };
		
	var i;
	for (i=self.list.length - 1; i >= 0; i--) {
		self.list[i].style.cursor = "pointer";
		self.list[i].onclick = function() {self.inp.value = this.firstChild.data;  self.rset(self); UI.PutInternalCode(self.inp); }
		self.list[i].onmouseover = function() { this.style.backgroundColor = self.h; }
		self.list[i].onmouseout = function() { this.style.backgroundColor = self.l; }
	} 
	
	self.inp.onfocus = function() { self.ul.style.display = 'block'; self.ul.className = 'focused'; self.hasfocus = true; self.sel = -1; UI.PutInternalCode(self.inp); }; 	
	self.inp.onblur = function() { if (self.ul.className=='focused') {self.rset(self);} self.ul.className = ''; self.hasfocus = false; UI.PutInternalCode(self.inp); }; 
	try { self.inp.onchange = UI.PutInternalCode(self.inp);	} catch(e){   }
	self.inp.onkeyup = 
		function(e) {
			var k = (e) ? e.keyCode : event.keyCode; 
			
			if (k == 40 || k == 13) { 
				if (self.sel == self.list.length-1) {
					self.list[self.sel].style.backgroundColor = self.l; 
					self.sel = -1;
				} 
				
				if (self.sel > -1) self.list[self.sel].style.backgroundColor = self.l; 
				
				self.inp.value = self.list[++self.sel].firstChild.data; 
				self.list[self.sel].style.backgroundColor = self.h;
			} 
			else if (k == 38 && self.sel > 0) {
					self.list[self.sel].style.backgroundColor = self.l; 
					self.inp.value = self.list[--self.sel].firstChild.data; self.list[self.sel].style.backgroundColor = self.h;
				}
			else if (((k > 47) && (k < 91)) || ((k > 95) && (k < 112)) || (k==8)) {
					var item, i;
					v = self.inp.value.toLowerCase();
					
					for (i=self.list.length - 1; i >= 0; i--) {
						item = self.list[i];
						s = item.firstChild.data.toLowerCase();						
						if (s.indexOf(v) < 0) {
							item.style.display = 'none'; 
						}
						else { item.style.display = 'block';  }
					}
				}
			return false;
		};
	self.inp.setAttribute( "autocomplete", "off" );
} 

UI.Combo.prototype.rset = function(self) { self.ul.style.display = 'none'; 
										self.sel = -1; 
										var i;
										for (i=self.list.length - 1; i >= 0; i--) {
											self.list[i].style.backgroundColor = self.l;
										}
										return false; };

// Returns current system date/hour in dd/mm/yyyy hh:nn format
UI.Now = function(secs)
{
	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //January is 0!
	var h = today.getHours(); 
	var m = today.getMinutes(); 
	var s = today.getSeconds();
	var yyyy = today.getFullYear();

	if (typeof secs == "undefined") secs = true;

	if(dd<10){ dd = '0' + dd; } 
	if(mm < 10){ mm = '0' + mm; } 
	if(h < 10){ h = '0' + h; } 
	if(m < 10){ m = '0' + m; } 

	if(s < 10){ s = '0' + s; } 
	if (secs) s = ':' + s; else s = "";
	var t = dd + '/' + mm + '/' + yyyy + ' ' + h + ':' + m + s;
	return t;
}

// Replace blanks with %20 for URL encoding
UI.PrepareURL = function(URL)
{
	return encodeURI(URL); //.replace(/\s/g, "%20");
}

// Extract a URL parameter value
UI.GetURLParam = function (name)
{
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if( results == null )
		return "";
	else
		return results[1];
}

// Get screen coordinates of a HTML Elemento
UI.Position = function(obj)
{
	var l = 0;
	var t = 0;
	
	if (obj.offsetParent) {
	    do {
			l += obj.offsetLeft;
			t += obj.offsetTop;
		} while (obj = obj.offsetParent);
		
		return [l,t];
	}		
}

// Check value of all elements with class .required
UI.CheckRequiredFields = function()
{
	Ctrls = this.$$('.required');
	var i;
	for (i=0;i<Ctrls.length;i++) {
		if (Ctrls[i].nodeName.toLowerCase() == 'input')
		{
			if (Ctrls[i].value.trim() == '') 
			{
				var div = document.createElement('div');
				div.style.position = "absolute";
				
				var Pos = this.Position(Ctrls[i]);
				
				if (Pos[0]) div.style.left = Pos[0] + "px";
				if (Pos[1]) div.style.top = (Pos[1] + 18) + "px";

				div.style.zIndex = "200";				
				div.setAttribute("class", "InfoBalloon error");			
				div.innerHTML = "<span style='color:green'>El campo " +  Ctrls[i].title + " es obligatorio</span>";
				
				document.body.appendChild(div);
				setTimeout(function() { $('.InfoBalloon').remove(); }, 5000);
				return false;
			}
		}
	}
	
	return true;
}

// Checks Status URL parameter, returned by the server and displays its result on a div with id="Status"
UI.CheckStatus = function()
{
	var Status = this.$$('#Status');
	try { Status.style.display = "none"; } catch(e){}
			
	var ActionStatus = unescape(this.GetURLParam('Status'));
							
	if (ActionStatus.length > 0) 
	{		
		if (ActionStatus.toLowerCase().indexOf('error') < 0)
			  Status.style.color = "green";
		else Status.style.color = "red";
		
		try { Status.style.marginLeft = this.$$('#content').style.marginLeft;} catch(e){}
		
		$('#Status').show('slow');
				
		Status.innerHTML = ActionStatus;
		setTimeout(function(){ $('#Status').hide(1000); }, 6000);
	}
}

// Para cajas de texto o combo-boxes con una lista de pares codigo/texto, pone el atributo _code al elemento 
// con el código del elemento seleccionado por el usuario
UI.PutInternalCode = function(obj)
{
	var ix = obj.value.indexOf("-");
	
	if (ix > 0)
	{
	   var Code = obj.value.slice(0, ix);
	   if (typeof Code == "string") Code = Code.trim();
	   obj.setAttribute("_code", Code);
	}
}

// Replace XML special chars
UI.XML = function(Str)
{
	var S = Str.replace('&', "&amp;");
	S = S.replace("'", "&apos;");	
	S = S.replace('"', "&quot;");	
	S = S.replace('<', "&lt;");
	S = S.replace('>', "&gt;");
	return S;
}


// (HTML5) Given a image elment, converts its picture to base64
UI.Base64.GetImage = function (img) 
{
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Get the data-URL formatted image
    // Firefox supports PNG and JPEG. You could check img.src to
    // guess the original format, but be aware the using "image/jpg"
    // will re-encode the image.
    var dataURL = canvas.toDataURL("image/png");

    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

UI.PreviewImage = function (input, img) 
{
    var files = input.files;
    if (!files.length) {
      alert('Please select a file!');
      return;
    }

    var file = files[0];
    var start = 0;
    var stop = file.size - 1;

    var reader = new FileReader();
		
    // If we use onloadend, we need to check the readyState.
     reader.onloadend = function(evt) {
       if (evt.target.readyState == FileReader.DONE) { // DONE == 2
         img.src = evt.target.result;        
       }
     };
	 
     if (file.webkitSlice) {
        file = file.webkitSlice(start, stop + 1);
     } 
	 else if (file.mozSlice) {
        file = file.mozSlice(start, stop + 1);
     }
     
     reader.readAsDataURL(file);
}

UI.GetBrowser = function()
{
	if (navigator.userAgent.toLowerCase().indexOf("msie") > -1)
	    this.Browser.ID = this.Browsers.IE;
	if (navigator.userAgent.toLowerCase().indexOf("chrome") > -1)	
		this.Browser.ID = this.Browsers.Chrome;		
	if (navigator.userAgent.toLowerCase().indexOf("firefox") > -1)
		this.Browser.ID = this.Browsers.Firefox;
	if (navigator.userAgent.toLowerCase().indexOf("safari") > -1)
		this.Browser.ID = this.Browsers.Safari;
	if (navigator.userAgent.toLowerCase().indexOf("opera") > -1)
		this.Browser.ID = this.Browsers.Opera;
	if (navigator.userAgent.toLowerCase().indexOf("android") > -1)
		this.Browser.ID = this.Browsers.Android;
	if (navigator.userAgent.toLowerCase().indexOf("blackberry") > -1)
		this.Browser.ID = this.Browsers.BlackBerry;
	if (navigator.userAgent.toLowerCase().indexOf("iemobile") > -1)
		this.Browser.ID = this.Browsers.IEMobile;
	if (navigator.userAgent.toLowerCase().indexOf("opera mini") > -1)
		this.Browser.ID = this.Browsers.OperaMini;		
	if (navigator.userAgent.toLowerCase().indexOf("opera mobi") > -1)
		this.Browser.ID = this.Browsers.OperaMobile;	
	if (navigator.userAgent.toLowerCase().indexOf("symbianos") > -1)
		this.Browser.ID = this.Browsers.OperaMobile;	
	if (navigator.userAgent.toLowerCase().indexOf("konqueror") > -1)
		this.Browser.ID = this.Browsers.Konqueror;			
	if (navigator.userAgent.toLowerCase().indexOf("msie 10") > -1)
		this.Browser.ID = this.Browsers.IE10;
	if (navigator.userAgent.toLowerCase().indexOf("msie 9") > -1)
		this.Browser.ID = this.Browsers.IE9;	
	if (navigator.userAgent.toLowerCase().indexOf("msie 8") > -1)
		this.Browser.ID = this.Browsers.IE8;	
	if (navigator.userAgent.toLowerCase().indexOf("msie 7") > -1)
		this.Browser.ID = this.Browsers.IE7;	
	if (navigator.userAgent.toLowerCase().indexOf("msie 6") > -1)
		this.Browser.ID = this.Browsers.IE6;
	
	this.Browser.SupportsHTML5 = ((this.Browser.ID == this.Browsers.Firefox) || 
								  (this.Browser.ID == this.Browsers.Chrome) || 
								  (this.Browser.ID == this.Browsers.IE10) || 
								  (this.Browser.ID == this.Browsers.Safari) ||
								  (this.Browser.ID == this.Browsers.Opera) ||
								  (this.Browser.ID == this.Browsers.Android) );
	return this.Browser.ID;
}

UI.IsBrowser = function(which)
{
	return (this.GetBrowser() == which);
}

UI.IsIE = function()
{
	return navigator.userAgent.toLowerCase().indexOf("msie") > -1;
}

// Creates or reuses a cell on a table and puts its Content and format
UI.SetCell = function(i, NewGrid, Row, h, a, w)
{
	var C =(NewGrid ? Row.insertCell(i) : Row.cells[i]); C.innerHTML = h; C.align = a; C.width =w;
	return C;
}

// Return cell content if exists, for compose row SearchString (ST)
UI.GetSearchText = function(cell)
{
	return cell.innerHTML.length > 0 ? "[" + cell.innerHTML + "]": "";
}

// Determines if a table must be cleared before loading DataSet Data
UI.PrepareGrid = function(Grid, DS)
{
	var ret = false;
	if (Grid.rows.length != DS.ToRow-(DS.FromRow-1)) {
		ret = true;
		this.ClearTable(Grid);						
	}	
	return ret;
}

UI.CloneObject = function(from)
{
	var to = $.extend(true, {}, from);	
	return to;
}

UI.ExtractFileName = function(fullPath)
{
	return fullPath.replace(/^.*[\\\/]/, '');
}

function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

UI.guid = function () {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}