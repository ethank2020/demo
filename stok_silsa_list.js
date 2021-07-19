/*
	##### 수정로그 #####
	2021.07.13 김현중 신규
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

			{
				id: "option", sortable: false, header: [{ text: '<div style="width: 50px; height: 31px;"><i class="dxi dxi-plus"> </i><div>', align: "center" }],
				htmlEnable: true, align: "center",
				width:50,
			},
		],
		selection: true,
		editable: false,
		autoWidth: true, 
		data: loadData.data[Object.keys(loadData.data)[0]],
	});
	layout.getCell('item_list').attach(item_grid);

	//click event [Header]
	item_grid.events.on("HeaderCellClick", async function(column,e){
		if(column.id == 'option'){
			if(index){
				try{
					var item_selectbox = await select_item();
					await stock_add(item_selectbox, index, (callback) => { //add stock window
						item_grid.data.parse(callback.data[Object.keys(callback.data)[0]]); //parsing callback data after adding stock
						item_grid.selection.setCell('', ''); //selectction reset 
					});
				}
				catch (err){
					console.log(err);
				}
			}else{
				d_alert('창고 또는 랙을 선택한 후 재고를 추가할 수 있습니다.');
			}
		}
	});

	//double click event [row]
	item_grid.events.on("CellDblClick", async function(row,column,e){
		await stock_update(row, index, (callback) => { //update stock window
			item_grid.data.parse(callback.data[Object.keys(callback.data)[0]]); //parsing callback data after updating stock
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

//add stock [parse][form][window]
async function stock_add(item_selectbox, index, afterAdd){
	const stock_form = new dhx.Form("", { //grid
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
				value: "등록",
			},
			{
				name: "func_nm",
				type: "input",
				hidden: true,
				value: "insert_stok_adjustment",
			},
			{
				name: "stwa_uid",
				type: "input",
				required: true,
				hidden: true,
				value: index.ware[0],
			},
			{
				name: "stwa_nm",
				type: "input",
				required: true,
				label: "창고",
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: index.ware[1],
			},
			{
				name: "stwara_uid",
				type: "input",
				required: true,
				hidden: true,
				value: index.rack[0],
			},
			{
				name: "stwara_nm",
				type: "input",
				required: true,
				label: "랙",
				disabled: true,
				labelPosition: "left",
				labelWidth: 70,
				value: index.rack[1],
			},
			{
				type: "combo",
				name: "stit_uid",
				label: "품목",
				required: true,
				labelPosition: "left",
				placeholder: "품목을 선택 해 주세요.",
				labelWidth: 70,
				data: item_selectbox.data.stnd_item
			},
			{
				type: "input",
				name: "stre_nowqty",
				required: true,
				label: "수량",
				labelPosition: "left",
				labelWidth: 70,
				errorMessage: "",
				validation: function(value) {
					return Number.isInteger(Number(value)) && value != '' && Number(value) >= 0;
				},
			},
			{
				type: "input",
				name: "stre_etc",
				label: "비고",
				labelPosition: "left",
				labelWidth: 70,
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
	const add_dhxWindow = new dhx.Window({ //window
		width: '500',
		height: '500',
		title: "재고 등록",
		movable: true,
		closable: true,
	});
	add_dhxWindow.attach(stock_form); //parse grid to window
	add_dhxWindow.show(); //showing window

	//event[change errorMessage before validation]
	stock_form.events.on("beforeValidate", async function(name, value){ //change messages after validating stre_nowqty form,
		if(name == "stre_nowqty"){
			if(value != ''){
				stock_form.getItem(name).config.errorMessage = '올바른 형식이 아닙니다.'
				if(value < 0){
					stock_form.getItem(name).config.errorMessage = '재고수량은 음수를 입력할 수 없습니다.'
				}
			}else{
				stock_form.getItem(name).config.errorMessage = '빈값을 입력할 수 없습니다.'
			}
		}
	});

	//event[save]
	stock_form.events.on("Click", async function(name, events) {
		if(name == 'button'){
			if(stock_form.validate() == true){ //chk validation
				stock_form.send("./?json=insert_dhtmlx", "POST")
				.then((output) => {
					var output = JSON.parse(output);
					if(output.overlap == 'new'){
						if(output.result == 'success'){
							d_alert('재고 등록이 완료되었습니다.');
							stock_form.clear();
							add_dhxWindow.hide();
							if(index.rack[0] == 0){ //inserted into warehouse
								select_stock('0', '', 'view_stok_record_rack', index.ware[0])
									.then((selected_data) => {
										afterAdd(selected_data); //callback new selected list -> item grid
									});
							}else{ //inserted into rack
								select_stock(index.rack[0], '', 'view_stok_record_rack')
									.then((selected_data) => {
										afterAdd(selected_data); //callback new selected list -> item grid
									});
							}
						}else{
							d_alert('재고 등록 과정에서 문제가 발생하였습니다.');
						}
					}else{
						d_alert('해당 창고에 이미 재고로 등록되어있는 품목입니다.');
					}
				})
				.catch((err) => err); // error[etc]
			}
		}

	});
}

//update stock [parse][form][window]
async function stock_update(row, index, afterUpdate){
	const ustock_form = new dhx.Form("", { //grid
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
				value: "조정",
			},
			{
				name: "func_nm",
				type: "input",
				hidden: true,
				value: "update_stok_adjustment",
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
				name: "stwa_uid",
				type: "input",
				required: true,
				hidden: true,
				value: index.ware[0],
			},
			{
				name: "stwa_nm",
				type: "input",
				required: true,
				label: "창고",
				disabled: true,
				labelPosition: "left",
				labelWidth: 100,
				value: index.ware[1],
			},
			{
				name: "stwara_uid",
				type: "input",
				required: true,
				hidden: true,
				value: index.rack[0],
			},
			{
				name: "stwara_nm",
				type: "input",
				required: true,
				label: "랙",
				disabled: true,
				labelPosition: "left",
				labelWidth: 100,
				value: index.rack[1],
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
				type: "input",
				name: "stre_nowqty",
				required: true,
				label: "변경되는 수량",
				labelPosition: "left",
				labelWidth: 100,
				errorMessage: "",
				validation: function(value) {
					return Number.isInteger(Number(value)) && value != '' && Number(value) >= 0 && Number(value) != row.nowqty;
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
	const update_dhxWindow = new dhx.Window({ //window
		width: '540',
		height: '540',
		title: "재고 조정",
		movable: true,
		closable: true,
	});
	update_dhxWindow.attach(ustock_form); //parse grid to window
	update_dhxWindow.show(); //showing window

	//event[change errorMessage before validation]
	ustock_form.events.on("beforeValidate", async function(name, value){ //change messages after validating stre_nowqty form,
		if(name == "stre_nowqty"){
			if(value != ''){
				ustock_form.getItem(name).config.errorMessage = '올바른 형식이 아닙니다.'
				if(value < 0){
					ustock_form.getItem(name).config.errorMessage = '재고수량은 음수를 입력할 수 없습니다.'
				}else if(value == row.nowqty){
					ustock_form.getItem(name).config.errorMessage = '변경 수량이 현재 재고와 동일합니다.'
				}
			}else{
				ustock_form.getItem(name).config.errorMessage = '빈값을 입력할 수 없습니다.'
			}
		}
	});

	//event[save]
	ustock_form.events.on("Click", async function(name, events) {
		if(name == 'button'){
			if(ustock_form.validate() == true){ //chk validation
				ustock_form.send("./?json=insert_dhtmlx", "POST")
				.then((output) => {
					var output = JSON.parse(output);
					if(output.result == 'success'){
						d_alert('재고 조정이 완료되었습니다.');
						ustock_form.clear();
						update_dhxWindow.hide();
						if(index.rack[0] == 0){ //updated stock in the warehouse
							select_stock('0', '', 'view_stok_record_rack', index.ware[0])
								.then((selected_data) => {
									afterUpdate(selected_data); //callback new selected list -> item grid
								});
						}else{ //updated stock in the rack
							select_stock(index.rack[0], '', 'view_stok_record_rack')
								.then((selected_data) => {
									afterUpdate(selected_data); //callback new selected list -> item grid
								});
						}
					}else{
						d_alert('재고 조정 과정에서 문제가 발생하였습니다.');
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

//every item for selectbox [select]
async function select_item(){
	var type = '';
	var data_array = new Array();
	var data_info = new Object();
	data_info.table = 'stnd_item';
	data_info.column = ['stit_uid AS id','stit_nm AS value'];
	data_info.order = {'stit_uid':'desc'};
	data_array.push(data_info);
	var item_info = select_common(type, data_array);
	return item_info;
}