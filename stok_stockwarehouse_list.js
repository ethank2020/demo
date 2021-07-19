/*
	##### 수정로그 #####
	2021.07.15 김현중 신규
*/
//*************************************** EXECUTION ******************************************//
$(async () => { 
	//create layout
	var layout = await create_layout();

	//select initial values
	try{
		/*option 1: select all data 
		var [warehouse_data, rack_data, item_data] = await Promise.all([select_warehouse(), select_rack(), select_stock()]);		
		*/

		//option2 : select only warehouse
		var [warehouse_data] = await Promise.all([select_warehouse()]);		
	}
	catch (err){
		console.log(err); //err from query
	}

	//parsing warehouse as grid
	try{
		/*option1 : parse all data
		var [warehouse_obj, rack_obj, item_obj] = await Promise.all([parse_warehouse(warehouse_data, layout), parse_rack(rack_data, layout), parse_item(item_data, layout)]);
		*/

		//option2 : parse only warehouse
		var [warehouse_obj] = await Promise.all([parse_warehouse(warehouse_data, layout)]);
		//initiating messages
		var rack_data = {data : {'stnd_warehouse_rack' : [{'stwara_nm' : '창고를 선택 해 주세요.'}]}}; 
		var item_data = {data : {'stnd_warehouse_item' : [{'stit_nm' : '창고 또는 랙을 선택 해 주세요.'}]}};
		//parsing only messages
		parse_rack(rack_data, layout, 'init');
		parse_item(item_data, layout, '', 'init');
	}
	catch (err){
		console.log(err); //err from parse
	}
});

//*************************************** CONFIG & LOGIC ******************************************//

//LAYOUT
async function create_layout(){
	var layout = new dhx.Layout("layout", { //LAYOUT
		type: "space",
		cols: [
			{
				id: 'warehouse',
				width: "15%"
			},
			{
				id: 'rack',
				width: "15%"
			},
			{
				type: 'item',
				width: "67.5%",
				rows: [
					{
						id: 'item_list',
						height:"94.3%",
					},
					{
						id: 'pagination',
						height:"6%",
					},
				]
			}	
		]
	});
	return layout;
}

//warehouse [parse][grid]
async function parse_warehouse(loadData, layout){
	var warehouse_grid = new dhx.Grid("", {
		columns: [
			{ id: "stwa_nm", header: [{ text: "창고명" }, {content: "inputFilter"}]},
			{ id: "stwa_uid", header: [{ text: "창고 고유번호"}], hidden : true},
		],
		selection: true,
		editable: false,
		autoWidth: true, 
		data: loadData.data.stnd_warehouse,
	});
	layout.getCell('warehouse').attach(warehouse_grid);

	//click event [Row]
	warehouse_grid.events.on("cellClick", async function(row,column,e){
		try{
			var [selected_item, selected_rack] = await Promise.all([select_stock('0', '', 'view_stok_record_rack', row.stwa_uid), select_rack(row.stwa_uid, type = '')]);		
			var ware_index = {'ware':[row.stwa_uid,row.stwa_nm], 'rack':[0, '미선택']};
			parse_item(selected_item, layout, ware_index); // parse selected items[level warehouse]
			parse_rack(selected_rack, layout); // parse selected racks
		}
		catch (err){
			console.log(err);
		}
	});
}


//rack [parse][grid]
async function parse_rack(loadData, layout, init){
	var rack_grid = new dhx.Grid("", {
		columns: [
			{ id: "stwara_nm", header: [{ text: "랙 명" }, {content: "inputFilter"}]},
			{ id: "stwara_uid", header: [{ text: "랙 고유번호"}], hidden : true},
			{ id: "stwa_uid", header: [{ text: "창고 고유번호"}], hidden : true},
		],
		selection: true,
		editable: false,
		autoWidth: true, 
		data: loadData.data.stnd_warehouse_rack,
	});
	layout.getCell('rack').attach(rack_grid);

	//click event [Row]
	rack_grid.events.on("cellClick", async function(row,column,e){
		if(!init){//from rack_grid after the first one
			try{
				var [selected_item, chk_stwa] = await Promise.all([select_stock(row.stwara_uid, '', 'view_stok_record_rack'), select_warehouse(row.stwa_uid)]);	// select stock & warehouse name
				var rack_index = {'ware':[row.stwa_uid, chk_stwa.data.stnd_warehouse[0].stwa_nm],'rack':[row.stwara_uid, row.stwara_nm]};
				parse_item(selected_item, layout, rack_index);// parse selected items[level rack]
			}
			catch (err){
				console.log(err);
			}
		}
	});

	//edit css for the first rack_grid message
	if(init){
		var rowId = rack_grid.data.getId(0);
		rack_grid.addRowCss(rowId, "init_row_grid");
		rack_grid.addCellCss(rowId, "stwara_nm", "init_cell_grid");
		rack_grid.selection.disable();
	}
}

//item [parse][grid]
async function parse_item(loadData, layout, index, init){
	var item_grid = new dhx.Grid("", {
		columns: [
			{ id: "stit_nm", header: [{ text: "품목명" }, {content: "inputFilter"}]},
			{ id: "stit_cd", header: [{ text: "품목코드" }, {content: "inputFilter"}]},
			{ id: "nowqty", header: [{ text: "수량" }], type : "number", format: "#,#"},
			{ id: "stit_uid", header: [{ text: "품목 고유번호"}], hidden : true},
		],
		selection: true,
		editable: false,
		autoWidth: true, 
		data: loadData.data[Object.keys(loadData.data)[0]],
	});
	layout.getCell('item_list').attach(item_grid);

	//double click event [row]
	item_grid.events.on("CellDblClick", async function(row,column,e){
		var warebox = await select_warebox();
		await stock_move(row, index, warebox, (callback) => { //move stock [from In(ware||rack) to Ex(ware||rack)]
			item_grid.data.parse(callback.data[Object.keys(callback.data)[0]]); //parsing callback data after moving stock
			item_grid.selection.setCell('', ''); //selectction reset 
		});
	});

	const pagination = new dhx.Pagination("", { //pagination for item list
		css: "dhx_widget--bordered dhx_widget--no-border_top",
		data: item_grid.data,
		pageSize: 16
	});
	layout.getCell("pagination").attach(pagination);

	//edit css for the first rack_grid message
	if(init){
		var rowId = item_grid.data.getId(0);
		item_grid.addRowCss(rowId, "init_row_grid");
		item_grid.addCellCss(rowId, "stit_nm", "init_cell_grid");
		item_grid.addCellCss(rowId, "nowqty", "init_cell_grid");
		item_grid.addCellCss(rowId, "stit_cd", "init_cell_grid");
		item_grid.addCellCss(rowId, "option", "init_cell_grid");
		item_grid.selection.disable();
	}
}

//move stock [parse][form][window]
async function stock_move(row, index, warebox, afterMove){
	const mstock_form = new dhx.Form("", { //grid
		css: "dhx_widget--bordered",
		padding: 40,
		rows: [
			{
				name: "login_uid",
				type: "input",
				hidden: true,
				value: login_uid,
			},
			{
				name: "stre_type",
				type: "input",
				hidden: true,
				value: "창고이동",
			},
			{
				name: "func_nm",
				type: "input",
				hidden: true,
				value: "update_stok_warehouse",
			},
			{
				name: "stitgr_uid",
				type: "input",
				hidden: true,
				value: row.stitgr_uid,
			},
			{
				name: "stitcl_uid",
				type: "input",
				hidden: true,
				value: row.stitcl_uid,
			},
			{
				name: "stit_uid",
				type: "input",
				hidden: true,
				value: row.stit_uid,
			},
			{
				name: "stit_nm",
				type: "input",
				required: true,
				label: "품목",
				disabled: true,
				labelPosition: "left",
				labelWidth: 100,
				value: row.stit_nm,
			},
			{
				name: "stwa_oriuid",
				type: "input",
				required: true,
				hidden: true,
				value: index.ware[0],
			},
			{
				name: "stwa_orinm",
				type: "input",
				required: true,
				label: "창고",
				disabled: true,
				labelPosition: "left",
				labelWidth: 100,
				value: index.ware[1],
			},
			{
				name: "stwara_oriuid",
				type: "input",
				required: true,
				hidden: true,
				value: index.rack[0],
			},
			{
				name: "stwara_orinm",
				type: "input",
				required: true,
				label: "랙",
				disabled: true,
				labelPosition: "left",
				labelWidth: 100,
				value: index.rack[1],
			},
			{
				name: "stre_prevqty",
				type: "input",
				required: true,
				label: "현재 재고",
				disabled: true,
				labelPosition: "left",
				labelWidth: 100,
				value: row.nowqty,
			},
			{
				name: "stwa_uid",
				type: "combo",
				required: true,
				label: "이동 창고",
				placeholder: "창고를 선택 해 주세요.",
				labelPosition: "left",
				labelWidth: 100,
				data: warebox.data.stnd_warehouse,
			},
			{
				name: "stwara_uid",
				type: "combo",
				label: "이동 랙",
				placeholder: "미선택",
				labelPosition: "left",
				labelWidth: 100,
				data:''
			},
			{
				type: "input",
				name: "stre_nowqty",
				required: true,
				label: "이동 수량",
				labelPosition: "left",
				labelWidth: 100,
				errorMessage: "",
				validation: function(value) {
					return Number.isInteger(Number(value)) && value != '' && Number(value) > 0 && Number(value) <= Number(row.nowqty);
				},
			},
			{
				type: "input",
				name: "stre_etc",
				label: "비고",
				labelPosition: "left",
				labelWidth: 100,
			},
			{
				align: "end",
				cols: [
					{
						name: "button",
						type: "button",
						submit: true,
						text: "저장",
						size: "medium",
						view: "flat",
						color: "primary",
					}
				]
			}
		]
	});
	const move_dhxWindow = new dhx.Window({ //window
		width: '540',
		height: '580',
		title: "창고 이동",
		movable: true,
		closable: true,
	});
	move_dhxWindow.attach(mstock_form); //parse grid to window
	move_dhxWindow.show(); //showing window

	//event[change errorMessage before validation]
	mstock_form.events.on("beforeValidate", async function(name, value){ //change messages after validating stre_nowqty form,
		if(name == "stre_nowqty"){
			if(value != ''){
				mstock_form.getItem(name).config.errorMessage = '올바른 형식이 아닙니다.'
				if(Number(value) > Number(row.nowqty)){
					mstock_form.getItem(name).config.errorMessage = '현재 창고에 재고 수량이 부족합니다.'
				}else if(Number(value) <= 0){
					mstock_form.getItem(name).config.errorMessage = '이동 수량은 0 또는 음수를 입력할 수 없습니다.'
				}
			}else{
				mstock_form.getItem(name).config.errorMessage = '빈값을 입력할 수 없습니다.'
			}
		}
	});

	//event[change combobox(In-rack) after changing value of combobox(In-ware)]
	mstock_form.getItem("stwa_uid").events.on("Change", async function(value) {//combobox[In-ware] event
		var rack_combo = mstock_form.getItem("stwara_uid").getWidget(); //get combobox[In-rack]
		try{
			if(value){
				var rackbox = await select_rackbox(value); //select In-rack data
				if(!Array.isArray(rackbox.data)){
					var rackbox_data = rackbox.data.stnd_warehouse_rack;
					rack_combo.data.parse(rackbox_data); //parse In-rack data
				}
			}else{
				var empty_box = [];
				rack_combo.data.parse(empty_box); //parse empty data
			}
			rack_combo.clear(); //clear showing value[In-rack] everytime event fires
		}catch(err){
			console.log(err);
		}
	});

	//event[save]
	mstock_form.events.on("Click", async function(name, events) {
		var place_chk = mstock_form.getValue();
		if(place_chk.stwara_uid == ''){ //set 0 to empty In-rack [GOTTEN DATA FOR COMPARING]
			place_chk.stwara_uid = 0;
		}
		if(place_chk.stwa_oriuid == place_chk.stwa_uid && place_chk.stwara_oriuid == place_chk.stwara_uid){ //duplicate check In[ware||rack] / Ex[ware||rack]
			d_alert('기존 창고/랙으로는 변경 할 수 없습니다.');
			return false;
		}
		if(name == 'button'){
			if(mstock_form.validate() == true){ //check validation
				mstock_form.send("./?json=insert_dhtmlx", "POST")
				.then((output) => {
					var output = JSON.parse(output);
					if(output.income.result == 'success'){
						d_alert('창고 이동이 완료되었습니다.');
						mstock_form.clear();
						move_dhxWindow.hide();

						if(index.rack[0] == 0){ //moved stock from the warehouse
							select_stock('0', '', 'view_stok_record_rack', index.ware[0])
								.then((selected_data) => {
									afterMove(selected_data); //callback new selected list -> item grid
								});
						}else{ //moved stock from the rack
							select_stock(index.rack[0], '', 'view_stok_record_rack')
								.then((selected_data) => {
									afterMove(selected_data); //callback new selected list -> item grid
								});
						}
					}
				})
				.catch((err) => err); // error[etc]
			}
		}
	});
}

//*************************************** FUNCTION [QUERY] ******************************************//

//warehouse [select]
async function select_warehouse(uid, type = ''){
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_warehouse';
	data_info.column = '*';
	data_info.order = {'stwa_uid':'desc'};
	if(uid){ //selective with stwa_uid
		data_info.column = ['stwa_nm']; //only for the name
		data_info.where = {and:[{column : 'stwa_uid', 'type' : '=', 'data' : uid}]};
	}
	data_array.push(data_info);
	var stwa_info = select_common(type, data_array, layout);
	return stwa_info;
}

//rack [select]
async function select_rack(uid, type = ''){
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_warehouse_rack';
	data_info.column = '*';
	data_info.order = {'stwara_uid':'desc'};
	if(uid){ //selective with warehouse
		data_info.where = {and:[{column : 'stwa_uid', 'type' : '=', 'data' : uid}]};
	}
	data_array.push(data_info);
	var stwara_info = select_common(type, data_array);
	return stwara_info;
}

//item [select] 
async function select_stock(uid, type = '', table_nm, p_uid){
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'view_stok_record_total';
	data_info.column = '*';
	data_info.order = {'stit_uid':'desc'};
	if(uid){ //selective with warehouse, rack
		data_info.table = table_nm;
		data_info.where = {and:[{column : 'stwara_uid', 'type' : '=', 'data' : uid}]};
		if(uid == 0){ //stock in warehouse
			data_info.where.and.push({column : 'stwa_uid', 'type' : '=', 'data' : p_uid});
		}
	}
	data_array.push(data_info);
	var item_info = select_common(type, data_array);
	return item_info;
}

//every warehouse for selectbox [select]
async function select_warebox(){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_warehouse';
	data_info.column = ['stwa_uid AS id','stwa_nm AS value'];
	data_info.order = {'stwa_uid':'desc'};
	data_array.push(data_info);
	var item_info = select_common(type, data_array);
	return item_info;
}

//selective In-rack for selectbox [select]
async function select_rackbox(uid){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_warehouse_rack';
	data_info.column = ['stwara_uid AS id','stwara_nm AS value'];
	data_info.where = {and:[{column : 'stwa_uid', 'type' : '=', 'data' : uid}]};
	data_info.order = {'stwara_uid':'desc'};
	data_array.push(data_info);
	var item_info = select_common(type, data_array);
	return item_info;
}